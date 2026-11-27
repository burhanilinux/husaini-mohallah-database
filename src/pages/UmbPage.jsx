import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import { sbGet } from "../lib/supabase.js";
import { sortFamilyMembers, toXLS } from "../lib/utils.js";
import {
  listDocumentTypes, listDocuments, addDocumentType, setTypeRequired,
  uploadDocument, deleteDocument, getDocumentUrl, downloadDocument,
  indexDocuments, missingTypes, fmtSize,
} from "../lib/umb.js";

function esc(v) {
  return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function UmbPage() {
  var ctx = useAppContext();
  var muminData = ctx.muminData || [];
  var canEdit = !!ctx.canEdit, canDelete = !!ctx.canDelete, isAdmin = !!ctx.isAdmin;

  var [types, setTypes] = useState([]);
  var [docs, setDocs] = useState([]);
  var [families, setFamilies] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState("");
  var [search, setSearch] = useState("");
  var [status, setStatus] = useState("");
  var [sector, setSector] = useState("");
  var [selectedKey, setSelectedKey] = useState(null);
  var [showTypes, setShowTypes] = useState(false);
  var [newType, setNewType] = useState("");
  var [newTypeRequired, setNewTypeRequired] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      var result = await Promise.all([listDocumentTypes(), listDocuments(), sbGet("families", "select=family_id,hof_its_id,sabil_no&order=family_id.asc")]);
      setTypes(result[0] || []); setDocs(result[1] || []); setFamilies(result[2] || []);
    } catch (e) {
      setError("Could not load UMB data. " + (e.message || "Check that the UMB migration has been applied."));
    } finally { setLoading(false); }
  }
  useEffect(function () { load(); }, []);

  var requiredTypes = useMemo(function () { return types.filter(function (t) { return t.is_required; }); }, [types]);
  var index = useMemo(function () { return indexDocuments(docs); }, [docs]);
  var typeName = useMemo(function () {
    var map = {}; types.forEach(function (t) { map[t.id] = t.name; }); return map;
  }, [types]);

  var households = useMemo(function () {
    var byFamily = {};
    muminData.forEach(function (m) {
      var key = m.family_id === null || m.family_id === undefined || m.family_id === "" ? "none" : String(m.family_id);
      if (!byFamily[key]) byFamily[key] = [];
      byFamily[key].push(m);
    });
    var famById = {};
    families.forEach(function (f) { famById[String(f.family_id)] = f; });
    return Object.keys(byFamily).map(function (key) {
      var family = famById[key] || null;
      var members = sortFamilyMembers(byFamily[key], family && family.hof_its_id);
      var hof = family && family.hof_its_id ? members.find(function (m) { return String(m.its_id) === String(family.hof_its_id); }) : null;
      if (!hof) hof = members.find(function (m) { return m.source_data && String(m.source_data.HOF_FM_TYPE || "").toUpperCase() === "HOF"; }) || null;
      var missing = 0, uploaded = 0;
      members.forEach(function (m) {
        missing += missingTypes(m, index, requiredTypes).length;
        uploaded += Object.keys(index[String(m.id)] || {}).length;
      });
      var sabil = (family && family.sabil_no) || (members[0] && members[0].sabil_no) || "";
      return { key: key, family: family, members: members, hof: hof, sabil: sabil, missing: missing, uploaded: uploaded };
    }).sort(function (a, b) {
      if (a.key === "none") return 1; if (b.key === "none") return -1;
      return String((a.hof && a.hof.name) || a.members[0].name || "").localeCompare(String((b.hof && b.hof.name) || b.members[0].name || ""));
    });
  }, [muminData, families, index, requiredTypes]);

  var sectors = useMemo(function () {
    var set = {}; muminData.forEach(function (m) { if (m.area_sector && m.area_sector.trim()) set[m.area_sector.trim()] = true; });
    return Object.keys(set).sort();
  }, [muminData]);

  var shown = useMemo(function () {
    var q = search.trim().toLowerCase();
    return households.filter(function (h) {
      if (status === "missing" && h.missing === 0) return false;
      if (status === "complete" && h.missing > 0) return false;
      if (sector && !h.members.some(function (m) { return m.area_sector === sector; })) return false;
      if (!q) return true;
      return String(h.key).toLowerCase().indexOf(q) >= 0 || String(h.sabil).toLowerCase().indexOf(q) >= 0 ||
        h.members.some(function (m) { return String(m.name || "").toLowerCase().indexOf(q) >= 0 || String(m.its_number || m.its_id || "").indexOf(q) >= 0; });
    });
  }, [households, search, status, sector]);

  var peopleComplete = muminData.filter(function (m) { return missingTypes(m, index, requiredTypes).length === 0; }).length;
  var totalBytes = docs.reduce(function (s, d) { return s + (Number(d.size_bytes) || 0); }, 0);
  var selected = selectedKey === null ? null : households.find(function (h) { return h.key === selectedKey; }) || null;

  function exportChecklist() {
    var cols = ["family_id", "sabil_no", "hof", "its_number", "name"].concat(types.map(function (t) { return t.name; })).concat(["missing_required"]);
    var rows = [];
    shown.forEach(function (h) {
      h.members.forEach(function (m) {
        var have = index[String(m.id)] || {};
        var row = {
          family_id: h.key === "none" ? "" : h.key, sabil_no: h.sabil, hof: h.hof ? h.hof.name : "",
          its_number: m.its_number || m.its_id || "", name: m.name || "",
          missing_required: missingTypes(m, index, requiredTypes).map(function (t) { return t.name; }).join(", "),
        };
        types.forEach(function (t) { row[t.name] = have[t.id] || ""; });
        rows.push(row);
      });
    });
    if (!rows.length) { setError("Nothing to export for the current filters."); return; }
    toXLS(rows, cols, "UMB-Documents-Checklist");
  }

  function printHousehold(h) {
    var w = window.open("", "_blank", "width=1000,height=700");
    if (!w) { setError("Your browser blocked the print window. Allow pop-ups and try again."); return; }
    var head = types.map(function (t) { return "<th>" + esc(t.name) + (t.is_required ? " *" : "") + "</th>"; }).join("");
    var body = h.members.map(function (m) {
      var have = index[String(m.id)] || {};
      return "<tr><td>" + esc(m.its_number || m.its_id) + "</td><td>" + esc(m.name) + "</td>" +
        types.map(function (t) { return "<td style='text-align:center'>" + (have[t.id] ? "✓ " + have[t.id] : "—") + "</td>"; }).join("") + "</tr>";
    }).join("");
    w.document.write("<!doctype html><html><head><meta charset='utf-8'><title>UMB — Family " + esc(h.key) + "</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#111;margin:0}h1{font-size:18px;margin:0 0 4px}p{font-size:11px;color:#555;margin:0 0 12px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #aaa;padding:6px 8px;text-align:left}th{background:#eee}.f{margin-top:10px;font-size:10px;color:#666}</style></head><body><h1>Husaini Mohallah — Umoor Marafiq Burhaniyah</h1><p>Family " + esc(h.key === "none" ? "— not assigned" : h.key) + " · Sabil " + esc(h.sabil || "—") + " · HOF: " + esc(h.hof ? h.hof.name : "Not assigned") + " · " + h.members.length + " member(s)</p><table><thead><tr><th>ITS</th><th>Name</th>" + head + "</tr></thead><tbody>" + body + "</tbody></table><div class='f'>* required document · Printed " + esc(new Date().toLocaleString()) + "</div><script>window.onload=function(){window.print()}<\/script></body></html>");
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

  var stats = [
    { label: "People", value: muminData.length, desc: "In the Mumin database" },
    { label: "Documents", value: docs.length, desc: fmtSize(totalBytes) + " stored" },
    { label: "Complete", value: peopleComplete, desc: "Have every required document" },
    { label: "Incomplete", value: muminData.length - peopleComplete, desc: "Missing a required document" },
  ];

  return <div>
    <div className="page-hdr" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
      <div><div className="page-title">Umoor Marafiq Burhaniyah</div><div className="page-sub">Documents for every person, grouped by family and Sabil No.</div></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
        <button className="btn btn-ghost btn-sm" onClick={function () { setShowTypes(!showTypes); }}>Document types</button>
        <button className="btn btn-gold btn-sm" onClick={exportChecklist}>📊 Export checklist (XLS)</button>
      </div>
    </div>

    {error && <div className="err-banner" role="alert">⚠ {error}<button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={function () { setError(""); }}>Dismiss</button></div>}

    <div className="stats-grid">{stats.map(function (s) { return <div className="stat-card" key={s.label}><div className="stat-lbl">{s.label}</div><div className="stat-val">{s.value}</div><div className="stat-desc">{s.desc}</div></div>; })}</div>

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
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 10 }}>Required types decide whether a person counts as complete. Changing them recalculates every family immediately.</div>
    </div>}

    <div className="card">
      <div className="card-hdr"><span className="card-title">Families ({shown.length})</span></div>
      <div className="toolbar">
        <input style={{ maxWidth: 300 }} placeholder="Search family, Sabil, name or ITS…" value={search} onChange={function (e) { setSearch(e.target.value); }} />
        <select style={{ maxWidth: 200 }} value={sector} onChange={function (e) { setSector(e.target.value); }}><option value="">All sectors</option>{sectors.map(function (s) { return <option key={s} value={s}>{s}</option>; })}</select>
        <select style={{ maxWidth: 200 }} value={status} onChange={function (e) { setStatus(e.target.value); }}><option value="">All families</option><option value="missing">Missing documents</option><option value="complete">Complete</option></select>
      </div>
      {loading ? <div className="loading"><Spinner /> Loading…</div> : shown.length === 0 ? <div className="empty"><div className="empty-icon">🗂</div><div>No families match these filters.</div></div> :
        <div style={{ overflowX: "auto" }}><table><thead><tr><th>Family</th><th>Sabil No.</th><th>HOF</th><th>Members</th><th>Required documents</th><th></th></tr></thead><tbody>
          {shown.slice(0, 300).map(function (h) {
            return <tr key={h.key} className="clickable-row" onClick={function () { setSelectedKey(h.key); }}>
              <td><span className="file-no">{h.key === "none" ? "—" : h.key}</span></td>
              <td>{h.sabil || "—"}</td>
              <td style={{ fontWeight: 500 }}>{h.key === "none" ? <span style={{ color: "#9ca3af" }}>People with no family</span> : h.hof ? h.hof.name : <span style={{ color: "#f59e0b" }}>Not assigned</span>}</td>
              <td>{h.members.length}</td>
              <td>{h.missing === 0 ? <span className="badge badge-active">Complete</span> : <span className="badge badge-pending">{h.missing} missing</span>}</td>
              <td><button className="btn btn-ghost btn-sm" onClick={function (e) { e.stopPropagation(); setSelectedKey(h.key); }}>Open</button></td>
            </tr>;
          })}
        </tbody></table></div>}
      {shown.length > 300 && <div style={{ padding: 14, fontSize: 12, color: "#6b7280" }}>Showing the first 300 families. Use search or filters to narrow the list.</div>}
    </div>

    {selected && <HouseholdModal
      household={selected} types={types} typeName={typeName} docs={docs} index={index} requiredTypes={requiredTypes}
      canEdit={canEdit} canDelete={canDelete} isAdmin={isAdmin} userEmail={ctx.getUserEmail()}
      onClose={function () { setSelectedKey(null); }}
      onPrint={function () { printHousehold(selected); }}
      onProfile={function (m) { ctx.setMuminPreview(m); }}
      onUploaded={function (row) { setDocs(function (old) { return [row].concat(old); }); }}
      onDeleted={function (id) { setDocs(function (old) { return old.filter(function (d) { return d.id !== id; }); }); }}
    />}
  </div>;
}

function HouseholdModal(props) {
  var h = props.household, types = props.types, docs = props.docs, index = props.index;
  var [openId, setOpenId] = useState(h.members[0] ? h.members[0].id : null);
  var [typeId, setTypeId] = useState(types[0] ? String(types[0].id) : "");
  var [file, setFile] = useState(null);
  var [fileKey, setFileKey] = useState(0);
  var [busy, setBusy] = useState(false);
  var [error, setError] = useState("");

  function docsFor(person) { return docs.filter(function (d) { return d.mumin_id === person.id; }); }

  async function upload(person) {
    if (!file) { setError("Choose a file to upload."); return; }
    setBusy(true); setError("");
    try {
      var row = await uploadDocument({ person: person, typeId: Number(typeId), typeName: props.typeName[typeId], file: file, userEmail: props.userEmail });
      props.onUploaded(row); setFile(null); setFileKey(function (k) { return k + 1; });
    } catch (e) { setError(e.message || "Upload failed."); }
    finally { setBusy(false); }
  }
  async function view(d) {
    var w = window.open("", "_blank");
    if (!w) { setError("Allow pop-ups to view documents."); return; }
    try { var url = await getDocumentUrl(d); w.location.href = url; }
    catch (e) { try { w.close(); } catch (_e) {} setError(e.message || "Could not open the document."); }
  }
  async function download(d) {
    try { await downloadDocument(d); } catch (e) { setError(e.message || "Download failed."); }
  }
  async function remove(d, person) {
    if (!window.confirm("Delete " + d.file_name + " for " + person.name + "? This cannot be undone.")) return;
    setBusy(true); setError("");
    try { await deleteDocument(d, person, props.typeName[d.document_type_id], props.userEmail); props.onDeleted(d.id); }
    catch (e) { setError(e.message || "Could not delete the document."); }
    finally { setBusy(false); }
  }

  return <div className="modal-overlay" onClick={props.onClose}>
    <div className="modal" onClick={function (e) { e.stopPropagation(); }} style={{ width: "min(980px, 96vw)" }}>
      <div className="modal-hdr">
        <div><div className="modal-title">{h.key === "none" ? "People with no family" : "Family " + h.key}</div>
          <div className="page-sub">Sabil {h.sabil || "—"} · HOF: {h.hof ? h.hof.name : "Not assigned"} · {h.members.length} member{h.members.length === 1 ? "" : "s"}</div></div>
        <button className="modal-close" onClick={props.onClose}>×</button>
      </div>
      <div className="modal-body">
        {error && <div className="err-banner" role="alert">⚠ {error}</div>}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={props.onPrint}>🖨 Print checklist</button>
        </div>
        {h.members.map(function (m) {
          var have = index[String(m.id)] || {};
          var miss = missingTypes(m, index, props.requiredTypes);
          var mine = docsFor(m);
          var expanded = openId === m.id;
          return <div key={m.id} style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 10, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", cursor: "pointer", flexWrap: "wrap" }} onClick={function () { setOpenId(expanded ? null : m.id); setError(""); setFile(null); }}>
              <span style={{ width: 14, color: "#c9a84c" }}>{expanded ? "▾" : "▸"}</span>
              <div style={{ flex: 1, minWidth: 160 }}><div style={{ fontWeight: 500, fontSize: 13 }}>{m.name}</div><div style={{ fontSize: 11, color: "#6b7280" }}>ITS {m.its_number || m.its_id}</div></div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{types.map(function (t) {
                var ok = !!have[t.id];
                return <span key={t.id} className="badge" style={{ color: ok ? "#34d399" : t.is_required ? "#fbbf24" : "#6b7280", border: "1px solid rgba(255,255,255,.1)" }}>{ok ? "✓ " : t.is_required ? "! " : ""}{t.name}</span>;
              })}</div>
              {miss.length === 0 && requiredCount(props.requiredTypes) > 0 && <span className="badge badge-active">Complete</span>}
            </div>
            {expanded && <div style={{ padding: "4px 14px 14px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
              {mine.length === 0 ? <div style={{ fontSize: 12, color: "#6b7280", padding: "10px 0" }}>No documents uploaded yet.</div> :
                <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "10px 0" }}>{mine.map(function (d) {
                  return <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 10px", background: "rgba(255,255,255,.02)", borderRadius: 8 }}>
                    <div style={{ flex: 1, minWidth: 180 }}><div style={{ fontSize: 12, fontWeight: 500 }}>{props.typeName[d.document_type_id] || "Document"}</div><div style={{ fontSize: 11, color: "#6b7280", overflowWrap: "anywhere" }}>{d.file_name} · {fmtSize(d.size_bytes)} · {new Date(d.created_at).toLocaleDateString("en-IN")}</div></div>
                    <button className="btn btn-ghost btn-sm" onClick={function () { view(d); }}>View</button>
                    <button className="btn btn-ghost btn-sm" onClick={function () { download(d); }}>Download</button>
                    {props.canDelete && <button className="btn btn-danger" disabled={busy} onClick={function () { remove(d, m); }}>Delete</button>}
                  </div>;
                })}</div>}
              {props.canEdit && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
                <select style={{ maxWidth: 190 }} value={typeId} onChange={function (e) { setTypeId(e.target.value); }}>{types.map(function (t) { return <option key={t.id} value={t.id}>{t.name}</option>; })}</select>
                <input key={fileKey} type="file" style={{ maxWidth: 280 }} accept="image/jpeg,image/png,image/webp,application/pdf" onChange={function (e) { setFile(e.target.files && e.target.files[0] || null); }} />
                <button className="btn btn-primary btn-sm" disabled={busy || !file || !typeId} onClick={function () { upload(m); }}>{busy ? "Working…" : "Upload"}</button>
                <button className="btn btn-ghost btn-sm" onClick={function () { props.onProfile(m); }}>Open profile</button>
              </div>}
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>JPG, PNG or WebP (compressed automatically) or PDF up to 5 MB.</div>
            </div>}
          </div>;
        })}
      </div>
      <div className="modal-ftr"><button className="btn btn-ghost" onClick={props.onClose}>Close</button></div>
    </div>
  </div>;
}

function requiredCount(list) { return (list || []).length; }
