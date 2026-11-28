import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import {
  listDocumentTypes, listDocumentsForPerson, addDocumentType, setTypeRequired,
  uploadDocument, deleteDocument, getDocumentUrl, downloadDocument,
  indexDocuments, missingTypes, fmtSize,
} from "../lib/umb.js";

function esc(v) {
  return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Nothing is listed until an ITS (or name) is searched, and only the person
// who is selected is ever opened. Documents are fetched for that person only.
export function UmbPage() {
  var ctx = useAppContext();
  var muminData = ctx.muminData || [];
  var canEdit = !!ctx.canEdit, canDelete = !!ctx.canDelete;

  var [types, setTypes] = useState([]);
  var [typesLoading, setTypesLoading] = useState(true);
  var [error, setError] = useState("");
  var [query, setQuery] = useState("");
  var [personId, setPersonId] = useState(null);
  var [docs, setDocs] = useState([]);
  var [docsLoading, setDocsLoading] = useState(false);
  var [typeId, setTypeId] = useState("");
  var [file, setFile] = useState(null);
  var [fileKey, setFileKey] = useState(0);
  var [busy, setBusy] = useState(false);
  var [showTypes, setShowTypes] = useState(false);
  var [newType, setNewType] = useState("");
  var [newTypeRequired, setNewTypeRequired] = useState(false);

  useEffect(function () {
    var active = true;
    listDocumentTypes().then(function (rows) {
      if (!active) return;
      setTypes(rows || []);
      if (rows && rows[0]) setTypeId(String(rows[0].id));
    }).catch(function (e) {
      if (active) setError("Could not load UMB data. " + (e.message || "Check that the UMB migration has been applied."));
    }).finally(function () { if (active) setTypesLoading(false); });
    return function () { active = false; };
  }, []);

  var person = personId === null ? null : muminData.find(function (m) { return m.id === personId; }) || null;

  useEffect(function () {
    if (personId === null) { setDocs([]); return undefined; }
    var active = true;
    setDocsLoading(true); setDocs([]);
    listDocumentsForPerson(personId).then(function (rows) { if (active) setDocs(rows || []); })
      .catch(function (e) { if (active) setError("Could not load documents. " + (e.message || "")); })
      .finally(function () { if (active) setDocsLoading(false); });
    return function () { active = false; };
  }, [personId]);

  var typeName = useMemo(function () {
    var map = {}; types.forEach(function (t) { map[t.id] = t.name; }); return map;
  }, [types]);
  var requiredTypes = useMemo(function () { return types.filter(function (t) { return t.is_required; }); }, [types]);
  var index = useMemo(function () { return indexDocuments(docs); }, [docs]);

  // Search results appear only after a real query, and are capped.
  var matches = useMemo(function () {
    var q = query.trim().toLowerCase();
    var isDigits = /^\d+$/.test(q);
    if (isDigits ? q.length < 4 : q.length < 3) return [];
    return muminData.filter(function (m) {
      if (isDigits) return String(m.its_number || m.its_id || "").indexOf(q) === 0;
      return String(m.name || "").toLowerCase().indexOf(q) >= 0;
    }).slice(0, 10);
  }, [muminData, query]);
  var searching = query.trim().length > 0;

  function selectPerson(m) {
    setPersonId(m.id); setQuery(""); setFile(null); setFileKey(function (k) { return k + 1; }); setError("");
  }
  function clearPerson() { setPersonId(null); setQuery(""); setFile(null); setError(""); }

  async function upload() {
    if (!person) return;
    if (!file) { setError("Choose a file to upload."); return; }
    setBusy(true); setError("");
    try {
      var row = await uploadDocument({ person: person, typeId: Number(typeId), typeName: typeName[typeId], file: file, userEmail: ctx.getUserEmail() });
      setDocs(function (old) { return [row].concat(old); });
      setFile(null); setFileKey(function (k) { return k + 1; });
    } catch (e) { setError(e.message || "Upload failed."); }
    finally { setBusy(false); }
  }
  async function view(d) {
    var w = window.open("", "_blank");
    if (!w) { setError("Allow pop-ups to view documents."); return; }
    try { w.location.href = await getDocumentUrl(d); }
    catch (e) { try { w.close(); } catch (_e) {} setError(e.message || "Could not open the document."); }
  }
  async function download(d) {
    try { await downloadDocument(d); } catch (e) { setError(e.message || "Download failed."); }
  }
  async function remove(d) {
    if (!window.confirm("Delete " + d.file_name + " for " + person.name + "? This cannot be undone.")) return;
    setBusy(true); setError("");
    try {
      await deleteDocument(d, person, typeName[d.document_type_id], ctx.getUserEmail());
      setDocs(function (old) { return old.filter(function (x) { return x.id !== d.id; }); });
    } catch (e) { setError(e.message || "Could not delete the document."); }
    finally { setBusy(false); }
  }

  function printChecklist() {
    var w = window.open("", "_blank", "width=900,height=700");
    if (!w) { setError("Your browser blocked the print window. Allow pop-ups and try again."); return; }
    var rows = types.map(function (t) {
      var n = index[String(person.id)] ? index[String(person.id)][t.id] : 0;
      return "<tr><td>" + esc(t.name) + (t.is_required ? " *" : "") + "</td><td style='text-align:center'>" + (n ? "✓ " + n : "—") + "</td></tr>";
    }).join("");
    w.document.write("<!doctype html><html><head><meta charset='utf-8'><title>UMB — " + esc(person.name) + "</title><style>@page{size:A4;margin:14mm}body{font-family:Arial,sans-serif;color:#111}h1{font-size:18px;margin:0 0 4px}p{font-size:12px;color:#555;margin:0 0 14px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #aaa;padding:7px 9px;text-align:left}th{background:#eee}.f{margin-top:10px;font-size:10px;color:#666}</style></head><body><h1>Husaini Mohallah — Umoor Marafiq Burhaniyah</h1><p>" + esc(person.name) + " · ITS " + esc(person.its_number || person.its_id) + " · Sabil " + esc(person.sabil_no || "—") + "</p><table><thead><tr><th>Document</th><th>Uploaded</th></tr></thead><tbody>" + rows + "</tbody></table><div class='f'>* required document · Printed " + esc(new Date().toLocaleString()) + "</div><script>window.onload=function(){window.print()}<\/script></body></html>");
    w.document.close();
  }

  async function saveNewType() {
    try {
      var created = await addDocumentType(newType, newTypeRequired, ctx.getUserEmail());
      if (created) setTypes(function (old) { return old.concat([created]); });
      setNewType(""); setNewTypeRequired(false); setError("");
    } catch (e) { setError(e.message || "Could not add the document type."); }
  }
  async function toggleRequired(t) {
    try {
      await setTypeRequired(t.id, !t.is_required);
      setTypes(function (old) { return old.map(function (x) { return x.id === t.id ? Object.assign({}, x, { is_required: !t.is_required }) : x; }); });
    } catch (e) { setError(e.message || "Could not update the document type."); }
  }

  var missing = person ? missingTypes(person, index, requiredTypes) : [];

  return <div>
    <div className="page-hdr" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
      <div><div className="page-title">Umoor Marafiq Burhaniyah</div><div className="page-sub">Search an ITS number to open one person's documents.</div></div>
      <button className="btn btn-ghost btn-sm" onClick={function () { setShowTypes(!showTypes); }}>Document types</button>
    </div>

    {error && <div className="err-banner" role="alert">⚠ {error}<button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={function () { setError(""); }}>Dismiss</button></div>}

    {showTypes && <div className="card" style={{ padding: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Document types</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {types.map(function (t) { return <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "6px 10px", textTransform: "none", letterSpacing: 0, fontSize: 12, color: "#d1c9bb" }}>
          <input type="checkbox" style={{ width: "auto" }} checked={!!t.is_required} disabled={!canEdit} onChange={function () { toggleRequired(t); }} />{t.name}{t.is_required ? " (required)" : ""}
        </label>; })}
      </div>
      {canEdit && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input style={{ maxWidth: 260 }} placeholder="New document type" value={newType} onChange={function (e) { setNewType(e.target.value); }} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, textTransform: "none", letterSpacing: 0 }}><input type="checkbox" style={{ width: "auto" }} checked={newTypeRequired} onChange={function (e) { setNewTypeRequired(e.target.checked); }} /> Required</label>
        <button className="btn btn-primary btn-sm" disabled={!newType.trim()} onClick={saveNewType}>Add type</button>
      </div>}
    </div>}

    {!person && <div className="card" style={{ padding: 18, overflow: "visible" }}>
      <label htmlFor="umb-search">Find a person</label>
      <input id="umb-search" style={{ marginTop: 8, maxWidth: 420 }} autoFocus placeholder="Enter ITS number (4+ digits) or name (3+ letters)" value={query} onChange={function (e) { setQuery(e.target.value); }} />
      {!searching && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>No records are shown until you search. Select a person to open only their documents.</div>}
      {searching && matches.length === 0 && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>{query.trim().length < (/^\d+$/.test(query.trim()) ? 4 : 3) ? "Keep typing…" : "No one matches this search."}</div>}
      {matches.length > 0 && <div style={{ marginTop: 12, maxWidth: 520, display: "flex", flexDirection: "column", gap: 6 }}>
        {matches.map(function (m) {
          return <button key={m.id} className="btn btn-ghost" style={{ justifyContent: "space-between", width: "100%", textAlign: "left" }} onClick={function () { selectPerson(m); }}>
            <span style={{ fontWeight: 500 }}>{m.name}</span><span style={{ fontSize: 11, color: "#9ca3af" }}>ITS {m.its_number || m.its_id}</span>
          </button>;
        })}
      </div>}
    </div>}

    {person && <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#c9a84c" }}>{person.name}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>ITS {person.its_number || person.its_id}{person.sabil_no ? " · Sabil " + person.sabil_no : ""}{person.family_id ? " · Family " + person.family_id : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
          <button className="btn btn-ghost btn-sm" onClick={function () { ctx.setMuminPreview(person); }}>Open profile</button>
          <button className="btn btn-ghost btn-sm" disabled={docsLoading || typesLoading} onClick={printChecklist}>🖨 Print checklist</button>
          <button className="btn btn-primary btn-sm" onClick={clearPerson}>Search another ITS</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>{types.map(function (t) {
        var ok = !!(index[String(person.id)] || {})[t.id];
        return <span key={t.id} className="badge" style={{ color: ok ? "#34d399" : t.is_required ? "#fbbf24" : "#6b7280", border: "1px solid rgba(255,255,255,.1)" }}>{ok ? "✓ " : t.is_required ? "! " : ""}{t.name}</span>;
      })}{!docsLoading && requiredTypes.length > 0 && missing.length === 0 && <span className="badge badge-active">Complete</span>}</div>

      {docsLoading ? <div className="loading"><Spinner /> Loading documents…</div> : docs.length === 0 ? <div style={{ fontSize: 12, color: "#6b7280", padding: "6px 0 12px" }}>No documents uploaded yet.</div> :
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>{docs.map(function (d) {
          return <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 10px", background: "rgba(255,255,255,.02)", borderRadius: 8 }}>
            <div style={{ flex: 1, minWidth: 180 }}><div style={{ fontSize: 12, fontWeight: 500 }}>{typeName[d.document_type_id] || "Document"}</div><div style={{ fontSize: 11, color: "#6b7280", overflowWrap: "anywhere" }}>{d.file_name} · {fmtSize(d.size_bytes)} · {new Date(d.created_at).toLocaleDateString("en-IN")}</div></div>
            <button className="btn btn-ghost btn-sm" onClick={function () { view(d); }}>View</button>
            <button className="btn btn-ghost btn-sm" onClick={function () { download(d); }}>Download</button>
            {canDelete && <button className="btn btn-danger" disabled={busy} onClick={function () { remove(d); }}>Delete</button>}
          </div>;
        })}</div>}

      {canEdit && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select style={{ maxWidth: 190 }} value={typeId} onChange={function (e) { setTypeId(e.target.value); }}>{types.map(function (t) { return <option key={t.id} value={t.id}>{t.name}</option>; })}</select>
        <input key={fileKey} type="file" style={{ maxWidth: 280 }} accept="image/jpeg,image/png,image/webp,application/pdf" onChange={function (e) { setFile(e.target.files && e.target.files[0] || null); }} />
        <button className="btn btn-primary btn-sm" disabled={busy || !file || !typeId} onClick={upload}>{busy ? "Working…" : "Upload"}</button>
      </div>}
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>JPG, PNG or WebP (compressed automatically) or PDF up to 5 MB.</div>
    </div>}
  </div>;
}
