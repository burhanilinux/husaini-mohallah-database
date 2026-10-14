import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { sbGet } from "../lib/supabase.js";
import { createFamily, updateFamily, moveMember, mergeFamilies, splitFamily } from "../lib/familyManagement.js";
import { Spinner } from "../components/Shared.jsx";

export function FamilyPage() {
  var ctx = useAppContext();
  var muminData = ctx.muminData || [];
  var canEdit = ctx.canEdit !== false;
  var [families, setFamilies] = useState([]);
  var [loading, setLoading] = useState(true);
  var [busy, setBusy] = useState(false);
  var [error, setError] = useState(null);
  var [search, setSearch] = useState("");
  var [selected, setSelected] = useState(null);
  var [action, setAction] = useState(null);
  var [notice, setNotice] = useState(null);

  async function loadFamilies() {
    setLoading(true); setError(null);
    try { setFamilies(await sbGet("families", "order=family_id.asc")); }
    catch (e) { setError(e.message || "Unable to load families"); }
    finally { setLoading(false); }
  }
  useEffect(function () { loadFamilies(); }, []);

  function done(message) {
    setNotice(message); setAction(null); setSelected(null);
    setTimeout(function () { setNotice(null); }, 3500);
    loadFamilies();
    setTimeout(function () { window.location.reload(); }, 250);
  }

  async function run(fn, success) {
    setBusy(true); setError(null);
    try { var result = await fn(); done(success(result)); }
    catch (e) { setError(e.message || "Family operation failed"); }
    finally { setBusy(false); }
  }

  var rows = useMemo(function () {
    var byFamily = {};
    muminData.forEach(function (m) {
      if (m.family_id === null || m.family_id === undefined || m.family_id === "") return;
      var key = String(m.family_id);
      if (!byFamily[key]) byFamily[key] = [];
      byFamily[key].push(m);
    });
    return families.map(function (f) {
      var members = byFamily[String(f.family_id)] || [];
      var hof = members.find(function (m) { return String(m.its_id) === String(f.hof_its_id); });
      var q = search.trim().toLowerCase();
      var hay = [f.family_id, f.hof_its_id, f.sabil_no, hof && hof.name, hof && hof.its_number].join(" ").toLowerCase();
      return { family: f, members: members, hof: hof, matches: !q || hay.indexOf(q) !== -1 };
    }).filter(function (r) { return r.matches; });
  }, [families, muminData, search]);

  var unassigned = muminData.filter(function (m) { return m.family_id === null || m.family_id === undefined || m.family_id === ""; }).length;
  var noHof = families.filter(function (f) { return !f.hof_its_id; }).length;

  return <div>
    <div className="page-hdr"><div><div className="page-title">Families & HOF</div><div className="page-sub">Family-level view and Head of Family management</div></div><div style={{ display: "flex", gap: 8 }}><button className="btn btn-ghost btn-sm" onClick={loadFamilies}>↻ Refresh</button>{canEdit && <button className="btn btn-primary btn-sm" onClick={function () { setAction({ type: "create" }); }}>+ New Family</button>}</div></div>
    {notice && <div className="card" style={{ marginBottom: 14, borderColor: "#3b6f48" }}>{notice}</div>}
    {error && <div className="card" style={{ marginBottom: 14, borderColor: "#7f1d1d", color: "#fca5a5" }}>⚠ {error}<button className="btn btn-ghost btn-sm" style={{ float: "right" }} onClick={function () { setError(null); }}>Dismiss</button></div>}
    <div className="stats-grid">
      <div className="stat-card"><div className="stat-lbl">Families</div><div className="stat-val">{families.length}</div><div className="stat-desc">Registered family groups</div></div>
      <div className="stat-card"><div className="stat-lbl">Members</div><div className="stat-val">{muminData.length}</div><div className="stat-desc">Across all families</div></div>
      <div className="stat-card"><div className="stat-lbl">Without HOF</div><div className="stat-val">{noHof}</div><div className="stat-desc">Needs attention</div></div>
      <div className="stat-card"><div className="stat-lbl">No Family</div><div className="stat-val">{unassigned}</div><div className="stat-desc">Members not assigned</div></div>
    </div>
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-hdr"><span className="card-title">Family Directory ({rows.length})</span><input style={{ width: 280 }} placeholder="Search family, HOF, ITS…" value={search} onChange={function (e) { setSearch(e.target.value); }} /></div>
      {loading ? <div className="loading"><Spinner /> Loading families…</div> : rows.length === 0 ? <div className="empty">No families found.</div> :
      <table><thead><tr><th>Family ID</th><th>HOF</th><th>HOF ITS</th><th>Members</th><th>Sabil</th><th>Sector</th><th>Action</th></tr></thead><tbody>
        {rows.map(function (r) { var sector = r.hof ? r.hof.area_sector : (r.members[0] && r.members[0].area_sector); return <tr key={r.family.family_id} className="clickable-row" onClick={function () { setSelected(r); }}>
          <td><span className="file-no">{r.family.family_id}</span></td><td style={{ fontWeight: 500 }}>{r.hof ? r.hof.name : <span style={{ color: "#f59e0b" }}>Not assigned</span>}</td><td>{r.family.hof_its_id || "—"}</td><td>{r.members.length}</td><td>{r.family.sabil_no || (r.members[0] && r.members[0].sabil_no) || "—"}</td><td style={{ color: "#c9a84c" }}>{sector || "—"}</td><td><button className="btn btn-ghost btn-sm" onClick={function (e) { e.stopPropagation(); setSelected(r); }}>Manage</button></td>
        </tr>; })}
      </tbody></table>}
    </div>
    {selected && <FamilyModal row={selected} canEdit={canEdit} busy={busy} onClose={function () { setSelected(null); }} onAction={function (config) { setAction(Object.assign({ row: selected }, config)); setSelected(null); }} />}
    {action && <ActionModal action={action} families={families} busy={busy} onClose={function () { setAction(null); }} onRun={run} />}
  </div>;
}

function FamilyModal({ row, canEdit, busy, onClose, onAction }) {
  var [hof, setHof] = useState(row.family.hof_its_id || "");
  var [sabil, setSabil] = useState(row.family.sabil_no || "");
  return <div className="modal-overlay" onClick={onClose}><div className="modal" onClick={function (e) { e.stopPropagation(); }} style={{ maxWidth: 900, width: "calc(100% - 32px)" }}>
    <div className="modal-hdr"><div className="modal-title">Family {row.family.family_id}</div><button className="modal-close" onClick={onClose}>×</button></div>
    <div style={{ padding: 20 }}>
      <div className="form-grid" style={{ marginBottom: 18 }}><label>Sabil No<input value={sabil} disabled={!canEdit} onChange={function (e) { setSabil(e.target.value); }} /></label><label>Head of Family ITS<input value={hof} disabled={!canEdit} placeholder="ITS number" onChange={function (e) { setHof(e.target.value); }} /></label></div>
      {canEdit && <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}><button className="btn btn-primary btn-sm" disabled={busy} onClick={function () { onAction({ type: "save", hof: hof, sabil: sabil }); }}>Save Family</button><button className="btn btn-ghost btn-sm" onClick={function () { onAction({ type: "move" }); }}>Move Member</button><button className="btn btn-ghost btn-sm" onClick={function () { onAction({ type: "split" }); }}>Split Family</button><button className="btn btn-ghost btn-sm" onClick={function () { onAction({ type: "merge" }); }}>Merge Family</button><button className="btn btn-ghost btn-sm" onClick={function () { printFamily(row); }}>Print</button><button className="btn btn-ghost btn-sm" onClick={function () { exportFamily(row); }}>Export CSV</button></div>}
      {!canEdit && <div style={{ marginBottom: 14 }}><button className="btn btn-ghost btn-sm" onClick={function () { printFamily(row); }}>Print Family</button><button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={function () { exportFamily(row); }}>Export CSV</button></div>}
      <table><thead><tr><th>ITS</th><th>Name</th><th>Relation</th><th>Age</th><th>Gender</th><th>Sector</th></tr></thead><tbody>{row.members.map(function (m) { return <tr key={m.id}><td>{m.its_number}</td><td style={{ fontWeight: String(m.its_id) === String(row.family.hof_its_id) ? 600 : 400 }}>{m.name}{String(m.its_id) === String(row.family.hof_its_id) ? " ★ HOF" : ""}</td><td>{m.spouse_its_id ? "Spouse linked" : "—"}</td><td>{m.age || "—"}</td><td>{m.gender || "—"}</td><td>{m.area_sector || "—"}</td></tr>; })}</tbody></table>
    </div>
  </div></div>;
}

function printFamily(row) {
  var w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  var body = row.members.map(function (m) { return "<tr><td>" + esc(m.its_number || m.its_id) + "</td><td>" + esc(m.name) + (String(m.its_id) === String(row.family.hof_its_id) ? " ★ HOF" : "") + "</td><td>" + esc(m.age || "—") + "</td><td>" + esc(m.gender || "—") + "</td><td>" + esc(m.area_sector || "—") + "</td></tr>"; }).join("");
  w.document.write("<!doctype html><html><head><title>Family " + esc(row.family.family_id) + "</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#222}h1{margin-bottom:4px}p{color:#666}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f3f3f3}@media print{button{display:none}}</style></head><body><h1>Family " + esc(row.family.family_id) + "</h1><p>HOF: " + esc(row.hof ? row.hof.name : "Not assigned") + " &nbsp; | &nbsp; Sabil: " + esc(row.family.sabil_no || "—") + " &nbsp; | &nbsp; Members: " + row.members.length + "</p><table><thead><tr><th>ITS</th><th>Name</th><th>Age</th><th>Gender</th><th>Sector</th></tr></thead><tbody>" + body + "</tbody></table><script>window.onload=function(){window.print();}</script></body></html>");
  w.document.close();
}

function exportFamily(row) {
  var lines = [["Family ID", "HOF", "Sabil No", "ITS", "Name", "Age", "Gender", "Sector"]];
  row.members.forEach(function (m) { lines.push([row.family.family_id, row.hof ? row.hof.name : "", row.family.sabil_no || "", m.its_number || m.its_id, m.name || "", m.age || "", m.gender || "", m.area_sector || ""]); });
  var csv = lines.map(function (r) { return r.map(function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
  var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "family_" + row.family.family_id + ".csv"; a.click(); URL.revokeObjectURL(a.href);
}
function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function ActionModal({ action, families, busy, onClose, onRun }) {
  var row = action.row;
  var [familyId, setFamilyId] = useState("");
  var [sabil, setSabil] = useState(action.type === "save" ? (action.sabil == null ? "" : action.sabil) : (row && row.family ? (row.family.sabil_no || "") : ""));
  var [hof, setHof] = useState(action.type === "save" ? (action.hof == null ? "" : action.hof) : "");
  var [target, setTarget] = useState("");
  var [selectedIds, setSelectedIds] = useState([]);
  var [newFamilyId, setNewFamilyId] = useState("");
  var [newSabil, setNewSabil] = useState("");
  var [newHof, setNewHof] = useState("");
  var members = row ? row.members : [];
  var title = action.type === "create" ? "Create Family" : action.type === "save" ? "Edit Family" : action.type === "move" ? "Move Member" : action.type === "split" ? "Split Family" : "Merge Families";
  function toggle(id) { setSelectedIds(function (old) { return old.indexOf(id) === -1 ? old.concat([id]) : old.filter(function (x) { return x !== id; }); }); }
  function submit() {
    if (action.type === "create") return onRun(function () { return createFamily(familyId, sabil, hof); }, function () { return "Family " + familyId + " created."; });
    if (action.type === "save") return onRun(function () { return updateFamily(row.family.family_id, { sabil_no: sabil, hof_its_id: hof }); }, function () { return "Family " + row.family.family_id + " updated."; });
    if (action.type === "move") return onRun(function () { return moveMember(target, familyId); }, function () { return "Member moved successfully."; });
    if (action.type === "merge") return onRun(function () { return mergeFamilies(target, row.family.family_id); }, function (r) { return "Families merged. " + r.moved + " member(s) moved."; });
    return onRun(function () { return splitFamily(row.family.family_id, selectedIds, newFamilyId, newSabil, newHof); }, function (r) { return "Family split. " + r.moved + " member(s) moved to Family " + r.newFamilyId + "."; });
  }
  return <div className="modal-overlay" onClick={onClose}><div className="modal" onClick={function (e) { e.stopPropagation(); }} style={{ maxWidth: 720, width: "calc(100% - 32px)" }}>
    <div className="modal-hdr"><div className="modal-title">{title}</div><button className="modal-close" onClick={onClose}>×</button></div><div style={{ padding: 20 }}>
      {action.type === "create" && <><p style={{ color: "#9ca3af" }}>Create a family group and optionally assign an existing Mumin as HOF.</p><div className="form-grid"><label>Family ID<input value={familyId} onChange={function (e) { setFamilyId(e.target.value); }} /></label><label>Sabil No<input value={sabil} onChange={function (e) { setSabil(e.target.value); }} /></label><label>HOF ITS<input value={hof} onChange={function (e) { setHof(e.target.value); }} /></label></div></>}
      {action.type === "save" && <><p style={{ color: "#9ca3af" }}>Change the family Sabil number or HOF. The selected HOF must already belong to this family.</p><div className="form-grid"><label>Sabil No<input value={sabil} onChange={function (e) { setSabil(e.target.value); }} /></label><label>HOF ITS<input value={hof} placeholder={String(row.family.hof_its_id || "Unassigned")} onChange={function (e) { setHof(e.target.value); }} /></label></div></>}
      {action.type === "move" && <><p style={{ color: "#9ca3af" }}>Move one member from Family {row.family.family_id} to another existing family.</p><div className="form-grid"><label>Member ITS<select value={target} onChange={function (e) { setTarget(e.target.value); }}><option value="">Select member…</option>{members.map(function (m) { return <option key={m.its_id} value={m.its_id}>{m.its_number || m.its_id} — {m.name}</option>; })}</select></label><label>Target Family<select value={familyId} onChange={function (e) { setFamilyId(e.target.value); }}><option value="">Select family…</option>{families.filter(function (f) { return String(f.family_id) !== String(row.family.family_id); }).map(function (f) { return <option key={f.family_id} value={f.family_id}>{f.family_id}</option>; })}</select></label></div></>}
      {action.type === "merge" && <><p style={{ color: "#fbbf24" }}>This permanently removes Family {row.family.family_id} after moving all its members to the target family.</p><label>Merge into<select value={target} onChange={function (e) { setTarget(e.target.value); }}><option value="">Select target family…</option>{families.filter(function (f) { return String(f.family_id) !== String(row.family.family_id); }).map(function (f) { return <option key={f.family_id} value={f.family_id}>{f.family_id}</option>; })}</select></label></>}
      {action.type === "split" && <><p style={{ color: "#9ca3af" }}>Select the members who should become a new family.</p><div className="form-grid"><label>New Family ID<input value={newFamilyId} onChange={function (e) { setNewFamilyId(e.target.value); }} /></label><label>Sabil No<input value={newSabil} onChange={function (e) { setNewSabil(e.target.value); }} /></label><label>New HOF ITS<select value={newHof} onChange={function (e) { setNewHof(e.target.value); }}><option value="">No HOF</option>{members.filter(function (m) { return selectedIds.indexOf(m.its_id) !== -1; }).map(function (m) { return <option key={m.its_id} value={m.its_id}>{m.its_number || m.its_id} — {m.name}</option>; })}</select></label></div><div style={{ maxHeight: 280, overflow: "auto", marginTop: 14 }}>{members.map(function (m) { var checked = selectedIds.indexOf(m.its_id) !== -1; return <label key={m.its_id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 4px", cursor: "pointer" }}><input type="checkbox" checked={checked} onChange={function () { toggle(m.its_id); }} /><span>{m.name || "Unnamed"} <span style={{ color: "#9ca3af" }}>({m.its_number || m.its_id})</span></span></label>; })}</div></>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}><button className="btn btn-ghost" disabled={busy} onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Saving…" : action.type === "merge" ? "Merge Families" : action.type === "split" ? "Create & Move" : action.type === "move" ? "Move Member" : action.type === "create" ? "Create Family" : "Save Changes"}</button></div>
    </div></div></div>;
}
