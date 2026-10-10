import { useEffect, useState } from "react";
import { sbGet, sbInsert, sbUpdate, sbUpsert, logActivity } from "../lib/supabase.js";

function fmtDate(value) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-IN");
}

export function SurveyVisitEntry({ survey, assignment, hofLabel, questions, user, canEdit, onClose, onChanged }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [surveyor, setSurveyor] = useState("");
  const [remarks, setRemarks] = useState("");
  const [answers, setAnswers] = useState({});
  const [history, setHistory] = useState([]);
  const [visit, setVisit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadHistory() {
    const rows = await sbGet("survey_visits", "assignment_id=eq." + encodeURIComponent(assignment.id) + "&select=*&order=visit_date.desc,created_at.desc");
    setHistory(Array.isArray(rows) ? rows : []);
  }
  useEffect(() => { loadHistory().catch(e => setError(e.message)); }, [assignment.id]);

  async function openExisting(row) {
    setError(""); setNotice(""); setVisit(row); setDate(row.visit_date || "");
    setSurveyor(row.surveyor || ""); setRemarks(row.remarks || "");
    try {
      const rows = await sbGet("survey_responses", "visit_id=eq." + encodeURIComponent(row.id) + "&select=*&order=created_at.asc");
      const next = {};
      (Array.isArray(rows) ? rows : []).forEach(r => { next[r.question_id] = r.answer; });
      setAnswers(next);
    } catch (e) { setError("Could not load answers: " + e.message); }
  }
  function newVisit() {
    setVisit(null); setDate(new Date().toISOString().slice(0,10)); setSurveyor(""); setRemarks(""); setAnswers({});
    setError(""); setNotice("");
  }
  function val(q) {
    const v = answers[q.id];
    return v == null ? (q.question_type === "multiple_choice" ? [] : "") : v;
  }
  function setAnswer(id, v) { setAnswers(old => ({...old, [id]:v})); }
  function renderQuestion(q) {
    const value = val(q);
    if (q.question_type === "yes_no" || q.question_type === "single_choice") {
      const opts = q.question_type === "yes_no" ? ["Yes","No"] : (q.options || []);
      return <select value={value} onChange={e => setAnswer(q.id,e.target.value)}><option value="">Choose…</option>{opts.map(o => <option key={o} value={o}>{o}</option>)}</select>;
    }
    if (q.question_type === "multiple_choice") return <div className="survey-multi-options">{(q.options || []).map(o => <label className="survey-option-check" key={o}><input type="checkbox" checked={Array.isArray(value) && value.includes(o)} onChange={e => setAnswer(q.id,e.target.checked ? [...value,o] : value.filter(x=>x!==o))}/>{o}</label>)}</div>;
    const type = q.question_type === "number" ? "number" : q.question_type === "date" ? "date" : "text";
    return <input type={type} value={value} maxLength={type==="text" ? 2000 : undefined} onChange={e=>setAnswer(q.id,type==="number" && e.target.value!=="" ? Number(e.target.value) : e.target.value)}/>;
  }
  async function save(submit) {
    if (!canEdit || survey.status === "closed") return;
    const missing = questions.find(q => q.is_required && (val(q)==="" || val(q)===null || (Array.isArray(val(q)) && !val(q).length)));
    if (submit && missing) { setError("Please answer the required question: " + missing.question_text); return; }
    if (!date) { setError("Select a visit date."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const payload = {survey_id:survey.id, assignment_id:assignment.id, visit_date:date, surveyor:surveyor.trim(), remarks:remarks.trim(), status:submit?"submitted":"draft", created_by:user?.id || null};
      let saved = visit;
      if (saved) {
        await sbUpdate("survey_visits", saved.id, {visit_date:date,surveyor:payload.surveyor,remarks:payload.remarks,status:payload.status});
        saved = {...saved,...payload};
      } else {
        const rows = await sbInsert("survey_visits",payload);
        saved = Array.isArray(rows) ? rows[0] : rows;
        if (!saved?.id) throw new Error("Database did not return the saved visit.");
      }
      const responseRows = questions.map(q => ({visit_id:saved.id,question_id:q.id,answer:val(q)===""?null:val(q)}));
      if (responseRows.length) await sbUpsert("survey_responses",responseRows,"visit_id,question_id");
      if (submit) await sbUpdate("survey_assignments",assignment.id,{status:"completed"});
      else await sbUpdate("survey_assignments",assignment.id,{status:"in_progress"});
      await logActivity(submit?"Submitted survey visit":"Saved survey visit draft","survey",survey.title+" · ITS "+assignment.hof_its_id,user?.email);
      setVisit(saved); await loadHistory(); if (onChanged) await onChanged();
      setNotice(submit ? "Visit submitted. Previous visits remain in history." : "Draft saved. Reopen it to continue later.");
    } catch(e) { setError("Could not save the complete visit: " + (e.message || "database error")); }
    finally { setBusy(false); }
  }

  return <section className="survey-section survey-visit-entry">
    <div className="survey-section-head"><div><h3>Field visit entry</h3><p>{hofLabel} · {survey.title}</p></div><button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button></div>
    {error && <div className="survey-alert survey-alert-error" role="alert">{error}</div>}
    {notice && <div className="survey-alert survey-alert-success" role="status">{notice}</div>}
    <div className="survey-visit-meta"><label>Visit date<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label><label>Surveyor<input value={surveyor} onChange={e=>setSurveyor(e.target.value)} maxLength={120} placeholder="Name of surveyor"/></label></div>
    <label className="survey-visit-remarks">Remarks<textarea value={remarks} onChange={e=>setRemarks(e.target.value)} maxLength={3000} rows={2} placeholder="Visit notes or follow-up"/></label>
    {questions.length ? <div className="survey-answer-list">{questions.map((q,i)=><label className="survey-answer-item" key={q.id}><span><b>{i+1}. {q.question_text}</b>{q.is_required && <em>Required</em>}</span>{renderQuestion(q)}</label>)}</div> : <div className="survey-empty">Add questions to this survey before recording responses.</div>}
    <div className="survey-visit-actions"><button className="btn btn-secondary" disabled={busy || !canEdit || survey.status==="closed"} onClick={()=>save(false)}>{busy?"Saving…":"Save draft"}</button><button className="btn btn-primary" disabled={busy || !canEdit || survey.status==="closed" || !questions.length} onClick={()=>save(true)}>{busy?"Saving…":"Submit visit"}</button></div>
    <div className="survey-visit-history"><h4>Visit history · {history.length}</h4>{history.length ? history.map(v=><div className="survey-history-row" key={v.id}><div><strong>{fmtDate(v.visit_date)}</strong><small>{v.surveyor || "Surveyor not recorded"} · {v.remarks || "No remarks"}</small></div><span className={"survey-status status-"+(v.status==="submitted"?"active":"draft")}>{v.status}</span><button className="btn btn-ghost btn-sm" onClick={()=>openExisting(v)}>Open</button></div>) : <p className="survey-note">No visits recorded yet.</p>}</div>
  </section>;
}
