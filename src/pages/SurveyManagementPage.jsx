import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { sbDelete, sbGet, sbInsert, sbUpdate, logActivity } from "../lib/supabase.js";
import { SurveyVisitEntry } from "./SurveyVisitEntry.jsx";
import * as XLSX from "xlsx";

var QUESTION_TYPES = [
  { value: "text", label: "Short text" },
  { value: "number", label: "Number" },
  { value: "yes_no", label: "Yes / No" },
  { value: "single_choice", label: "Single choice" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "date", label: "Date" },
];

function dateLabel(value) {
  if (!value) return "—";
  try { return new Date(value + (value.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-IN"); }
  catch (_e) { return value; }
}

export function SurveyManagementPage() {
  var ctx = useAppContext();
  var auth = useAuth();
  var canEdit = auth.canEdit;
  var [surveys, setSurveys] = useState([]);
  var [families, setFamilies] = useState([]);
  var [assignments, setAssignments] = useState([]);
  var [questions, setQuestions] = useState([]);
  var [selectedId, setSelectedId] = useState("");
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState("");
  var [notice, setNotice] = useState("");
  var [title, setTitle] = useState("");
  var [description, setDescription] = useState("");
  var [startDate, setStartDate] = useState("");
  var [endDate, setEndDate] = useState("");
  var [questionText, setQuestionText] = useState("");
  var [questionType, setQuestionType] = useState("text");
  var [questionOptions, setQuestionOptions] = useState("");
  var [questionRequired, setQuestionRequired] = useState(false);
  var [sectorFilter, setSectorFilter] = useState("");
  var [subSectorFilter, setSubSectorFilter] = useState("");
  var [householdSearch, setHouseholdSearch] = useState("");
  var [activeAssignment, setActiveAssignment] = useState(null);
  var [reportVisits, setReportVisits] = useState([]);
  var [reportResponses, setReportResponses] = useState([]);
  var [reportLoaded, setReportLoaded] = useState(false);
  var [reportLoading, setReportLoading] = useState(false);
  var [reportFrom, setReportFrom] = useState("");
  var [reportTo, setReportTo] = useState("");
  var [reportSector, setReportSector] = useState("");

  var selectedSurvey = surveys.find(function (s) { return s.id === selectedId; }) || null;
  var sectorOptions = ctx.sectorsData || [];
  var subSectorOptions = (ctx.subSectorsData || []).filter(function (s) {
    return !sectorFilter || String(s.sector_id) === String(sectorFilter);
  });
  var householdRows = useMemo(function () {
    var byIts = new Map((ctx.muminData || []).map(function (m) { return [String(m.its_id || m.its_number || ""), m]; }));
    return (families || []).map(function (f) {
      var m = byIts.get(String(f.hof_its_id));
      if (!m || m.deleted_at) return null;
      var sub = (ctx.subSectorsData || []).find(function (s) { return String(s.id) === String(m.sub_sector_id); });
      var sector = sub && (ctx.sectorsData || []).find(function (s) { return String(s.id) === String(sub.sector_id); });
      if (!sector) sector = (ctx.sectorsData || []).find(function (s) { return String(s.name || "").toLowerCase() === String(m.area_sector || "").toLowerCase(); });
      return { family: f, mumin: m, sector: sector || null, subSector: sub || null };
    }).filter(Boolean).filter(function (h) {
      if (sectorFilter && String((h.sector && h.sector.id) || "") !== String(sectorFilter)) return false;
      if (subSectorFilter && String((h.subSector && h.subSector.id) || "") !== String(subSectorFilter)) return false;
      var q = householdSearch.trim().toLowerCase();
      return !q || String(h.family.hof_its_id).includes(q) || String(h.mumin.name || "").toLowerCase().includes(q);
    }).sort(function (a, b) { return String(a.mumin.name || "").localeCompare(String(b.mumin.name || "")); });
  }, [families, ctx.muminData, ctx.sectorsData, ctx.subSectorsData, sectorFilter, subSectorFilter, householdSearch]);

  var reload = useCallback(async function (preferredId) {
    setLoading(true); setError("");
    try {
      var result = await Promise.all([
        sbGet("surveys", "select=*&order=created_at.desc"),
        sbGet("families", "select=family_id,hof_its_id,sabil_no&order=hof_its_id.asc"),
      ]);
      var surveyRows = Array.isArray(result[0]) ? result[0] : [];
      setSurveys(surveyRows);
      setFamilies(Array.isArray(result[1]) ? result[1] : []);
      var nextId = preferredId || selectedId;
      if (!nextId || !surveyRows.some(function (s) { return s.id === nextId; })) nextId = surveyRows[0] ? surveyRows[0].id : "";
      setSelectedId(nextId);
    } catch (e) {
      setError("Could not load Survey Management data. " + (e.message || "Please retry."));
    } finally { setLoading(false); }
  }, [selectedId]);

  useEffect(function () { reload(""); }, []);

  useEffect(function () {
    if (!selectedId) { setQuestions([]); setAssignments([]); return; }
    var active = true;
    Promise.all([
      sbGet("survey_questions", "survey_id=eq." + encodeURIComponent(selectedId) + "&select=*&order=sort_order.asc,created_at.asc"),
      sbGet("survey_assignments", "survey_id=eq." + encodeURIComponent(selectedId) + "&select=*&order=assigned_at.desc"),
    ]).then(function (result) {
      if (!active) return;
      setQuestions(Array.isArray(result[0]) ? result[0] : []);
      setAssignments(Array.isArray(result[1]) ? result[1] : []);
    }).catch(function (e) { if (active) setError("Could not load survey questions or assignments. " + e.message); });
    return function () { active = false; };
  }, [selectedId]);

  async function createSurvey(e) {
    e.preventDefault();
    if (!canEdit) return;
    if (!title.trim()) { setError("Enter a survey name first."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      var rows = await sbInsert("surveys", {
        title: title.trim(), description: description.trim(), status: "draft",
        start_date: startDate || null, end_date: endDate || null,
        created_by: auth.user && auth.user.id || null,
      });
      var created = Array.isArray(rows) ? rows[0] : rows;
      if (!created || !created.id) throw new Error("Survey was not returned by the database.");
      await logActivity("Created survey", "survey", created.title, auth.user && auth.user.email);
      setTitle(""); setDescription(""); setStartDate(""); setEndDate("");
      await reload(created.id);
      setNotice("Survey created. Add its questions and assign HOF households below.");
    } catch (e2) { setError(e2.message || "Unable to create survey."); }
    finally { setSaving(false); }
  }

  async function changeStatus(nextStatus) {
    if (!selectedSurvey || !canEdit) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await sbUpdate("surveys", selectedSurvey.id, { status: nextStatus, updated_at: new Date().toISOString() });
      await logActivity("Updated survey status", "survey", selectedSurvey.title + " → " + nextStatus, auth.user && auth.user.email);
      await reload(selectedSurvey.id); setNotice("Survey status updated.");
    } catch (e) { setError(e.message || "Could not update survey status."); }
    finally { setSaving(false); }
  }

  async function addQuestion(e) {
    e.preventDefault();
    if (!canEdit || !selectedSurvey) return;
    if (!questionText.trim()) { setError("Enter a question."); return; }
    var opts = questionOptions.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
    if ((questionType === "single_choice" || questionType === "multiple_choice") && opts.length < 2) {
      setError("Choice questions need at least two options, one per line."); return;
    }
    setSaving(true); setError(""); setNotice("");
    try {
      await sbInsert("survey_questions", {
        survey_id: selectedSurvey.id, question_text: questionText.trim(), question_type: questionType,
        options: (questionType === "single_choice" || questionType === "multiple_choice") ? opts : [],
        is_required: questionRequired, sort_order: questions.length,
      });
      setQuestionText(""); setQuestionOptions(""); setQuestionRequired(false);
      var rows = await sbGet("survey_questions", "survey_id=eq." + encodeURIComponent(selectedSurvey.id) + "&select=*&order=sort_order.asc,created_at.asc");
      setQuestions(Array.isArray(rows) ? rows : []);
      setNotice("Question added.");
    } catch (e) { setError(e.message || "Could not add question."); }
    finally { setSaving(false); }
  }

  async function removeQuestion(question) {
    if (!canEdit || !window.confirm("Remove this question? Existing responses to it will prevent deletion.")) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await sbDelete("survey_questions", question.id);
      setQuestions(function (old) { return old.filter(function (q) { return q.id !== question.id; }); });
      setNotice("Question removed.");
    } catch (e) { setError(e.message || "Could not remove question. Existing responses may be attached."); }
    finally { setSaving(false); }
  }

  async function assignHouseholds() {
    if (!canEdit || !selectedSurvey) return;
    if (selectedSurvey.status === "closed") { setError("Reopen this survey before assigning households."); return; }
    var assigned = new Set(assignments.map(function (a) { return String(a.hof_its_id); }));
    var pending = householdRows.filter(function (h) { return !assigned.has(String(h.family.hof_its_id)); });
    if (!pending.length) { setNotice("No new HOFs match these filters. Existing assignments were preserved."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      var payload = pending.map(function (h) {
        return { survey_id: selectedSurvey.id, hof_its_id: Number(h.family.hof_its_id),
          sector_id: h.sector ? h.sector.id : null, sub_sector_id: h.subSector ? h.subSector.id : null, status: "pending" };
      });
      for (var i = 0; i < payload.length; i += 250) await sbInsert("survey_assignments", payload.slice(i, i + 250));
      await logActivity("Assigned HOF households", "survey", selectedSurvey.title + " (" + pending.length + " new HOFs)", auth.user && auth.user.email);
      var rows = await sbGet("survey_assignments", "survey_id=eq." + encodeURIComponent(selectedSurvey.id) + "&select=*&order=assigned_at.desc");
      setAssignments(Array.isArray(rows) ? rows : []);
      setNotice(pending.length + " HOF household(s) assigned. Previous assignments and survey history were preserved.");
    } catch (e) { setError("Assignment stopped: " + (e.message || "database error") + ". Refresh and retry; already saved assignments are retained."); }
    finally { setSaving(false); }
  }

  async function loadReport() {
    if (!selectedSurvey) return;
    setReportLoading(true); setError(""); setNotice("");
    try {
      var visits = await sbGet("survey_visits", "survey_id=eq." + encodeURIComponent(selectedSurvey.id) + "&select=*&order=visit_date.desc,created_at.desc");
      visits = Array.isArray(visits) ? visits : [];
      var responses = [];
      for (var i = 0; i < visits.length; i += 50) {
        var batch = visits.slice(i, i + 50);
        if (!batch.length) continue;
        var ids = batch.map(function (v) { return v.id; }).filter(Boolean);
        if (ids.length) {
          var rows = await sbGet("survey_responses", "visit_id=in.(" + ids.join(",") + ")&select=*&order=created_at.asc");
          if (Array.isArray(rows)) responses = responses.concat(rows);
        }
      }
      setReportVisits(visits); setReportResponses(responses); setReportLoaded(true);
      setNotice("Report refreshed: " + visits.length + " visit record(s) loaded.");
    } catch (e) { setError("Could not load survey report. " + (e.message || "Please retry.")); }
    finally { setReportLoading(false); }
  }

  var reportRows = reportVisits.filter(function (v) {
    if (reportFrom && v.visit_date < reportFrom) return false;
    if (reportTo && v.visit_date > reportTo) return false;
    var a = assignments.find(function (x) { return x.id === v.assignment_id; });
    if (reportSector && String(a && a.sector_id || "") !== String(reportSector)) return false;
    return true;
  }).map(function (v) {
    var a = assignments.find(function (x) { return x.id === v.assignment_id; });
    var h = householdRows.find(function (x) { return String(x.family.hof_its_id) === String(a && a.hof_its_id); });
    var answerMap = {};
    reportResponses.filter(function (r) { return r.visit_id === v.id; }).forEach(function (r) { answerMap[r.question_id] = r.answer; });
    return { visit:v, assignment:a, hof:h, answerMap:answerMap };
  });

  function exportReport() {
    if (!reportRows.length || !selectedSurvey) return;
    var headers = ["Survey", "Visit Date", "HOF Name", "HOF ITS", "Sector", "Sub-sector", "Surveyor", "Visit Status", "Remarks"].concat(questions.map(function (q) { return q.question_text; }));
    function safeCell(value) {
      var text = value === null || value === undefined ? "" : (typeof value === "object" ? JSON.stringify(value) : String(value));
      return /^[\\s]*[=+@\\-\\t\\r]/.test(text) ? "'" + text : text;
    }
    var rows = reportRows.map(function (r) {
      return [selectedSurvey.title, r.visit.visit_date, r.hof && r.hof.mumin.name || "", r.assignment && r.assignment.hof_its_id || "", r.hof && r.hof.sector && r.hof.sector.name || "", r.hof && r.hof.subSector && r.hof.subSector.name || "", r.visit.surveyor || "", r.visit.status || "", r.visit.remarks || ""].concat(questions.map(function (q) { return r.answerMap[q.id] === undefined ? "" : r.answerMap[q.id]; })).map(safeCell);
    });
    var sheet = XLSX.utils.aoa_to_sheet([headers].concat(rows));
    sheet["!cols"] = headers.map(function (h) { return { wch: Math.min(36, Math.max(12, String(h).length + 2)) }; });
    sheet["!autofilter"] = { ref: XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rows.length,c:headers.length-1}}) };
    var book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Survey Visits");
    XLSX.writeFile(book, (selectedSurvey.title || "survey").replace(/[^a-z0-9_-]+/gi,"_") + "_report.xlsx");
  }

  function printReport() {
    if (!reportRows.length) return;
    window.print();
  }

  var counts = assignments.reduce(function (a, x) { a[x.status] = (a[x.status] || 0) + 1; return a; }, {});
  var stats = [
    { label: "Surveys", value: surveys.length },
    { label: "Active surveys", value: surveys.filter(function (s) { return s.status === "active"; }).length },
    { label: "HOFs assigned", value: assignments.length },
    { label: "Completed", value: counts.completed || 0 },
  ];

  return <div className="page survey-mgmt">
    <div className="page-hdr"><div><div className="page-title">Survey Management</div><div className="page-sub">Create and run separate surveys throughout the year. Existing Mohallah Survey records are preserved.</div></div>
      <button className="btn btn-secondary" onClick={function () { ctx.setPage("mohallah-survey"); }}>Open existing survey records ↗</button>
    </div>
    {error && <div className="survey-alert survey-alert-error" role="alert">{error}<button onClick={function () { setError(""); }} aria-label="Dismiss error">×</button></div>}
    {notice && <div className="survey-alert survey-alert-success" role="status">{notice}<button onClick={function () { setNotice(""); }} aria-label="Dismiss message">×</button></div>}
    <div className="survey-stat-grid">{stats.map(function (s) { return <div className="survey-stat" key={s.label}><span>{s.label}</span><strong>{s.value}</strong></div>; })}</div>
    <div className="survey-layout">
      <section className="survey-panel">
        <div className="survey-panel-title"><div><h2>Surveys</h2><p>Keep each survey separate by year or purpose.</p></div><button className="btn btn-ghost btn-sm" onClick={function () { reload(selectedId); }} disabled={loading}>↻ Refresh</button></div>
        {loading ? <div className="survey-empty">Loading surveys…</div> : surveys.length === 0 ? <div className="survey-empty">No managed surveys yet. Create one to begin.</div> :
          <div className="survey-list">{surveys.map(function (s) { return <button key={s.id} className={"survey-list-item" + (s.id === selectedId ? " selected" : "")} onClick={function () { setSelectedId(s.id); setError(""); setNotice(""); }}>
            <span className="survey-list-name">{s.title}</span><span className={"survey-status status-" + s.status}>{s.status}</span><small>{dateLabel(s.start_date)}{s.end_date ? " – " + dateLabel(s.end_date) : ""}</small>
          </button>; })}</div>}
        {canEdit && <form className="survey-create-form" onSubmit={createSurvey}>
          <h3>＋ Create a survey</h3>
          <label>Survey name<input value={title} onChange={function (e) { setTitle(e.target.value); }} maxLength={160} required placeholder="e.g. Ashara 1448 Household Survey" /></label>
          <label>Description<textarea value={description} onChange={function (e) { setDescription(e.target.value); }} rows={2} placeholder="Purpose and notes (optional)" /></label>
          <div className="survey-date-grid"><label>Start date<input type="date" value={startDate} onChange={function (e) { setStartDate(e.target.value); }} /></label><label>End date<input type="date" value={endDate} min={startDate || undefined} onChange={function (e) { setEndDate(e.target.value); }} /></label></div>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Create survey"}</button>
        </form>}
      </section>

      <section className="survey-panel survey-detail-panel">
        {!selectedSurvey ? <div className="survey-empty"><strong>Start with a new survey</strong><p>Create a survey to configure questions and assign HOFs.</p></div> : <>
          <div className="survey-detail-head"><div><div className="survey-eyebrow">SELECTED SURVEY</div><h2>{selectedSurvey.title}</h2><p>{selectedSurvey.description || "No description provided."}</p><small>{dateLabel(selectedSurvey.start_date)}{selectedSurvey.end_date ? " – " + dateLabel(selectedSurvey.end_date) : ""}</small></div>
            <div className="survey-status-actions"><span className={"survey-status status-" + selectedSurvey.status}>{selectedSurvey.status}</span>{canEdit && <select aria-label="Survey status" value={selectedSurvey.status} disabled={saving} onChange={function (e) { changeStatus(e.target.value); }}><option value="draft">Draft</option><option value="active">Active</option><option value="closed">Closed</option></select>}</div>
          </div>
          <div className="survey-section"><div className="survey-section-head"><div><h3>1. Configure questions</h3><p>Questions belong to this survey only; future surveys can use different forms.</p></div><span className="survey-count">{questions.length}</span></div>
            {questions.length > 0 && <div className="survey-question-list">{questions.map(function (q, i) { return <div className="survey-question-row" key={q.id}><div className="survey-question-num">{i + 1}</div><div className="survey-question-content"><strong>{q.question_text}</strong><small>{(QUESTION_TYPES.find(function (t) { return t.value === q.question_type; }) || {}).label || q.question_type}{q.is_required ? " · Required" : ""}{Array.isArray(q.options) && q.options.length ? " · " + q.options.join(", ") : ""}</small></div>{canEdit && <button className="btn btn-ghost btn-sm survey-remove" disabled={saving} onClick={function () { removeQuestion(q); }} title="Remove question">Remove</button>}</div>; })}</div>}
            {canEdit && <form className="survey-question-form" onSubmit={addQuestion}>
              <label>Question text<input value={questionText} onChange={function (e) { setQuestionText(e.target.value); }} maxLength={500} required placeholder="Type your question" /></label>
              <div className="survey-question-form-grid"><label>Answer type<select value={questionType} onChange={function (e) { setQuestionType(e.target.value); }}><option value="text">Short text</option><option value="number">Number</option><option value="yes_no">Yes / No</option><option value="single_choice">Single choice</option><option value="multiple_choice">Multiple choice</option><option value="date">Date</option></select></label><label className="survey-required-check"><input type="checkbox" checked={questionRequired} onChange={function (e) { setQuestionRequired(e.target.checked); }} /> Required</label></div>
              {(questionType === "single_choice" || questionType === "multiple_choice") && <label>Options <small>(one per line; at least two)</small><textarea value={questionOptions} onChange={function (e) { setQuestionOptions(e.target.value); }} rows={3} placeholder={"Yes\nNo\nNot applicable"} /></label>}
              <button className="btn btn-secondary" type="submit" disabled={saving}>{saving ? "Saving…" : "＋ Add question"}</button>
            </form>}
          </div>
          <div className="survey-section"><div className="survey-section-head"><div><h3>2. Assign HOF households</h3><p>All HOFs are available by default. Sector and sub-sector filters narrow the assignment list.</p></div><span className="survey-count">{assignments.length} assigned</span></div>
            <div className="survey-filter-grid"><label>Sector<select value={sectorFilter} onChange={function (e) { setSectorFilter(e.target.value); setSubSectorFilter(""); }}><option value="">All sectors</option>{sectorOptions.map(function (s) { return <option key={s.id} value={s.id}>{s.name}</option>; })}</select></label><label>Sub-sector<select value={subSectorFilter} onChange={function (e) { setSubSectorFilter(e.target.value); }}><option value="">All sub-sectors</option>{subSectorOptions.map(function (s) { return <option key={s.id} value={s.id}>{s.name}</option>; })}</select></label><label>Find HOF<input value={householdSearch} onChange={function (e) { setHouseholdSearch(e.target.value); }} placeholder="Name or ITS number" /></label></div>
            <div className="survey-assignment-summary"><div><strong>{householdRows.length}</strong><span>HOFs match filters</span></div><div><strong>{householdRows.filter(function (h) { return !assignments.some(function (a) { return String(a.hof_its_id) === String(h.family.hof_its_id); }); }).length}</strong><span>Not yet assigned</span></div><button className="btn btn-primary" onClick={assignHouseholds} disabled={!canEdit || saving || selectedSurvey.status === "closed" || !householdRows.length}>{saving ? "Saving…" : "Assign matching HOFs"}</button></div>
            <div className="survey-assignment-status">{["pending","in_progress","completed","not_available"].map(function (key) { return <span key={key}><b>{counts[key] || 0}</b> {key.replace("_", " ")}</span>; })}</div>
            <div className="survey-assigned-list">{assignments.filter(function (a) { return householdRows.some(function (h) { return String(h.family.hof_its_id) === String(a.hof_its_id); }); }).slice(0,200).map(function (a) { var h = householdRows.find(function (x) { return String(x.family.hof_its_id) === String(a.hof_its_id); }); return <div className="survey-assigned-row" key={a.id}><div className="survey-assigned-person"><strong>{h && h.mumin.name || "HOF"}</strong><small>ITS {a.hof_its_id}{h && h.sector ? " · " + h.sector.name : ""}{h && h.subSector ? " / " + h.subSector.name : ""}</small></div><span className={"survey-status status-" + (a.status === "completed" ? "active" : "draft")}>{a.status.replace("_", " ")}</span><button className="btn btn-secondary btn-sm" disabled={!canEdit || saving || selectedSurvey.status === "closed"} onClick={function () { setActiveAssignment(a); }}>Record visit</button></div>; })}</div>
            <p className="survey-note">Assignments are added without duplicating HOFs already assigned to this survey. Repeat household visits are supported separately; old survey records are not modified.</p>
          </div>
          <div className="survey-section survey-report-section">
            <div className="survey-section-head"><div><h3>4. Survey reports & export</h3><p>Review date-wise household visits, answers and sector progress. Reports only include the selected survey.</p></div><span className="survey-count">{reportRows.length} visits</span></div>
            <div className="survey-report-filters">
              <label>From date<input type="date" value={reportFrom} onChange={function(e){setReportFrom(e.target.value);}} /></label>
              <label>To date<input type="date" value={reportTo} onChange={function(e){setReportTo(e.target.value);}} /></label>
              <label>Sector<select value={reportSector} onChange={function(e){setReportSector(e.target.value);}}><option value="">All sectors</option>{sectorOptions.map(function(s){return <option key={s.id} value={s.id}>{s.name}</option>;})}</select></label>
              <button className="btn btn-secondary" disabled={reportLoading} onClick={loadReport}>{reportLoading ? "Loading…" : reportLoaded ? "Refresh report" : "Load report"}</button>
            </div>
            {reportLoaded && <><div className="survey-report-summary"><div><strong>{reportRows.length}</strong><span>Visits in filter</span></div><div><strong>{reportRows.filter(function(r){return r.visit.status==="submitted";}).length}</strong><span>Submitted</span></div><div><strong>{new Set(reportRows.map(function(r){return r.assignment && r.assignment.hof_its_id;}).filter(Boolean)).size}</strong><span>HOFs visited</span></div><div><strong>{new Set(reportRows.filter(function(r){return r.hof && r.hof.sector;}).map(function(r){return r.hof.sector.id;})).size}</strong><span>Sectors reached</span></div></div>
              <div className="survey-report-actions"><button className="btn btn-secondary" disabled={!reportRows.length} onClick={exportReport}>Export Excel (.xlsx)</button><button className="btn btn-ghost" disabled={!reportRows.length} onClick={printReport}>Print report</button></div>
              <div className="survey-report-table-wrap"><table className="survey-report-table"><thead><tr><th>Date</th><th>HOF</th><th>ITS</th><th>Sector / Sub-sector</th><th>Surveyor</th><th>Status</th><th>Remarks</th>{questions.map(function(q){return <th key={q.id}>{q.question_text}</th>;})}</tr></thead><tbody>{reportRows.map(function(r){return <tr key={r.visit.id}><td>{dateLabel(r.visit.visit_date)}</td><td>{r.hof && r.hof.mumin.name || "HOF"}</td><td>{r.assignment && r.assignment.hof_its_id || "—"}</td><td>{r.hof && r.hof.sector && r.hof.sector.name || "—"}{r.hof && r.hof.subSector ? " / "+r.hof.subSector.name : ""}</td><td>{r.visit.surveyor || "—"}</td><td>{r.visit.status || "—"}</td><td>{r.visit.remarks || "—"}</td>{questions.map(function(q){var value=r.answerMap[q.id];return <td key={q.id}>{value===undefined||value===null?"—":Array.isArray(value)?value.join(", "):typeof value==="object"?JSON.stringify(value):String(value)}</td>;})}</tr>;})}</tbody></table>{!reportRows.length && <p className="survey-note">No visits match the selected date and sector filters.</p>}</div>
            </>}
            {!reportLoaded && <p className="survey-note">Load the report to fetch visit records and answers for this survey.</p>}
          </div>
          {activeAssignment && <SurveyVisitEntry key={activeAssignment.id} survey={selectedSurvey} assignment={activeAssignment} hofLabel={(householdRows.find(function (h) { return String(h.family.hof_its_id) === String(activeAssignment.hof_its_id); }) || {}).mumin?.name ? (householdRows.find(function (h) { return String(h.family.hof_its_id) === String(activeAssignment.hof_its_id); }).mumin.name + " · ITS " + activeAssignment.hof_its_id) : "ITS " + activeAssignment.hof_its_id} questions={questions} user={auth.user} canEdit={canEdit} onClose={function () { setActiveAssignment(null); }} onChanged={function () { return reload(selectedId); }} />}

        </>}
      </section>
    </div>
  </div>;
}
