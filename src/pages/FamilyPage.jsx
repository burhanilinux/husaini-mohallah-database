import { useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { sbGet } from "../lib/supabase.js";
import { Spinner } from "../components/Shared.jsx";

export function FamilyPage() {
  var ctx = useAppContext();
  var muminData = ctx.muminData || [];
  var [families, setFamilies] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [search, setSearch] = useState("");
  var [selected, setSelected] = useState(null);

  async function loadFamilies() {
    setLoading(true); setError(null);
    try { setFamilies(await sbGet("families", "order=family_id.asc")); }
    catch (e) { setError(e.message || "Unable to load families"); }
    finally { setLoading(false); }
  }
  useEffect(function () { loadFamilies(); }, []);

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
    <div className="page-hdr"><div><div className="page-title">Families & HOF</div><div className="page-sub">Family-level view and Head of Family management</div></div><button className="btn btn-ghost btn-sm" onClick={loadFamilies}>↻ Refresh</button></div>
    <div className="stats-grid">
      <div className="stat-card"><div className="stat-lbl">Families</div><div className="stat-val">{families.length}</div><div className="stat-desc">Registered family groups</div></div>
      <div className="stat-card"><div className="stat-lbl">Members</div><div className="stat-val">{muminData.length}</div><div className="stat-desc">Across all families</div></div>
      <div className="stat-card"><div className="stat-lbl">Without HOF</div><div className="stat-val">{noHof}</div><div className="stat-desc">Needs attention</div></div>
      <div className="stat-card"><div className="stat-lbl">No Family</div><div className="stat-val">{unassigned}</div><div className="stat-desc">Members not assigned</div></div>
    </div>
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-hdr"><span className="card-title">Family Directory ({rows.length})</span><input style={{ width: 280 }} placeholder="Search family, HOF, ITS…" value={search} onChange={function (e) { setSearch(e.target.value); }} /></div>
      {loading ? <div className="loading"><Spinner /> Loading families…</div> : error ? <div className="empty"><div style={{ color: "#f87171" }}>⚠ {error}</div></div> : rows.length === 0 ? <div className="empty">No families found.</div> :
      <table><thead><tr><th>Family ID</th><th>HOF</th><th>HOF ITS</th><th>Members</th><th>Sabil</th><th>Sector</th><th>Action</th></tr></thead><tbody>
        {rows.map(function (r) { var sector = r.hof ? r.hof.area_sector : (r.members[0] && r.members[0].area_sector); return <tr key={r.family.family_id} className="clickable-row" onClick={function () { setSelected(r); }}>
          <td><span className="file-no">{r.family.family_id}</span></td><td style={{ fontWeight: 500 }}>{r.hof ? r.hof.name : <span style={{ color: "#f59e0b" }}>Not assigned</span>}</td><td>{r.family.hof_its_id || "—"}</td><td>{r.members.length}</td><td>{r.family.sabil_no || (r.members[0] && r.members[0].sabil_no) || "—"}</td><td style={{ color: "#c9a84c" }}>{sector || "—"}</td><td><button className="btn btn-ghost btn-sm" onClick={function (e) { e.stopPropagation(); setSelected(r); }}>View</button></td>
        </tr>; })}
      </tbody></table>}
    </div>
    {selected && <div className="modal-overlay" onClick={function () { setSelected(null); }}><div className="modal" onClick={function (e) { e.stopPropagation(); }} style={{ maxWidth: 760, width: "calc(100% - 32px)" }}>
      <div className="modal-hdr"><div className="modal-title">Family {selected.family.family_id}</div><button className="modal-close" onClick={function () { setSelected(null); }}>×</button></div>
      <div style={{ padding: 20 }}><div style={{ marginBottom: 16, color: "#9ca3af", fontSize: 13 }}>HOF: <strong style={{ color: "#f3f4f6" }}>{selected.hof ? selected.hof.name : "Not assigned"}</strong> · {selected.members.length} member{selected.members.length === 1 ? "" : "s"}</div>
      <table><thead><tr><th>ITS</th><th>Name</th><th>Relation</th><th>Age</th><th>Gender</th><th>Sector</th></tr></thead><tbody>{selected.members.map(function (m) { return <tr key={m.id}><td>{m.its_number}</td><td style={{ fontWeight: m.its_id === selected.family.hof_its_id ? 600 : 400 }}>{m.name}{m.its_id === selected.family.hof_its_id ? " ★ HOF" : ""}</td><td>{m.spouse_its_id ? "Spouse linked" : "—"}</td><td>{m.age || "—"}</td><td>{m.gender || "—"}</td><td>{m.area_sector || "—"}</td></tr>; })}</tbody></table></div>
    </div></div>}
  </div>;
}
