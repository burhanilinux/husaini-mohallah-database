import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { sbDelete, sbGet, sbInsert, sbUpdate, logActivity } from "../lib/supabase.js";
import { SurveyVisitEntry } from "./SurveyVisitEntry.jsx";

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
          {activeAssignment && <SurveyVisitEntry key={activeAssignment.id} survey={selectedSurvey} assignment={activeAssignment} hofLabel={(householdRows.find(function (h) { return String(h.family.hof_its_id) === String(activeAssignment.hof_its_id); }) || {}).mumin?.name ? (householdRows.find(function (h) { return String(h.family.hof_its_id) === String(activeAssignment.hof_its_id); }).mumin.name + " · ITS " + activeAssignment.hof_its_id) : "ITS " + activeAssignment.hof_its_id} questions={questions} user={auth.user} canEdit={canEdit} onClose={function () { setActiveAssignment(null); }} onChanged={function () { return reload(selectedId); }} />}

        </>}
      </section>
    </div>
  </div>;
}
