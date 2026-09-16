import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import { getMuminAge } from "../lib/utils.js";

export function MuminPage() {
  var ctx = useAppContext();
  var filteredMumin = ctx.filteredMumin || [], loading = ctx.loading;
  var canEdit = ctx.canEdit, canDelete = ctx.canDelete;
  var openModal = ctx.openModal, loadAll = ctx.loadAll;
  var search = ctx.search, setSearch = ctx.setSearch;
  var selSector = ctx.selSector, setSelSector = ctx.setSelSector;
  var areaSectors = ctx.areaSectors || [];
  var setMuminPreview = ctx.setMuminPreview, deleteRecord = ctx.deleteRecord;

  // The database's HOF/FAMILY_ID relationship is the source of truth.
  // Only HOF rows are shown at the top level; their linked members are
  // displayed underneath them. This removes the separate Families feature
  // without changing or deleting any underlying family data.
  var grouped = [];
  var byFamily = {};
  var standalone = [];

  filteredMumin.forEach(function (m) {
    var source = m.source_data || {};
    var isHof = String(source.HOF_FM_TYPE || "").toUpperCase() === "HOF";
    var familyKey = m.family_id === null || m.family_id === undefined || m.family_id === "" ? null : String(m.family_id);
    if (isHof && familyKey) {
      byFamily[familyKey] = byFamily[familyKey] || { hof: m, members: [] };
      byFamily[familyKey].hof = m;
    } else if (familyKey) {
      byFamily[familyKey] = byFamily[familyKey] || { hof: null, members: [] };
      byFamily[familyKey].members.push(m);
    } else {
      standalone.push(m);
    }
  });

  // A few source exports may not carry HOF_FM_TYPE consistently. In that
  // case, families with an explicit HOF_ID are still grouped correctly.
  filteredMumin.forEach(function (m) {
    var key = m.family_id === null || m.family_id === undefined || m.family_id === "" ? null : String(m.family_id);
    if (!key || !byFamily[key] || byFamily[key].hof) return;
    var candidate = filteredMumin.find(function (x) {
      return String(x.family_id) === key && x.its_id !== m.its_id && String((x.source_data || {}).HOF_FM_TYPE || "").toUpperCase() === "HOF";
    });
    if (candidate) {
      byFamily[key].hof = candidate;
      byFamily[key].members = byFamily[key].members.filter(function (x) { return x.its_id !== candidate.its_id; });
    }
  });

  Object.keys(byFamily).forEach(function (key) {
    var group = byFamily[key];
    if (group.hof) grouped.push(group);
  });

  grouped.sort(function (a, b) { return String(a.hof.name || "").localeCompare(String(b.hof.name || "")); });

  function memberMatchesGroup(group) {
    var q = search.trim().toLowerCase();
    if (!q) return true;
    return group.hof.name.toLowerCase().indexOf(q) >= 0 || String(group.hof.its_number || group.hof.its_id).indexOf(q) >= 0 || group.members.some(function (m) {
      return String(m.name || "").toLowerCase().indexOf(q) >= 0 || String(m.its_number || m.its_id).indexOf(q) >= 0;
    });
  }

  var visibleGroups = grouped.filter(memberMatchesGroup);

  return (
    <div>
      <div className="page-hdr">
        <div className="page-title">Mumin Data</div>
        <div className="page-sub">Heads of Family with their linked family members</div>
      </div>
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">Families ({visibleGroups.length}) · {filteredMumin.length} records</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={loadAll}>{loading ? <Spinner /> : "↻"}</button>
            {canEdit && <button className="btn btn-primary" onClick={function () { openModal("mumin", "add"); }}>+ Add Mumin</button>}
          </div>
        </div>
        <div className="toolbar">
          <input style={{ width: 260 }} placeholder="Search HOF or family member…" value={search} onChange={function (e) { setSearch(e.target.value); }} />
          <select value={selSector || ""} onChange={function (e) { setSelSector(e.target.value || null); }} style={{ width: 200 }}>
            <option value="">All Sectors</option>
            {areaSectors.map(function (s) { return <option key={s} value={s}>{s}</option>; })}
          </select>
        </div>
        {loading ? <div className="loading"><Spinner /> Loading…</div> : visibleGroups.length === 0 ? (
          <div className="empty"><div className="empty-icon">👤</div><div>No HOF records found</div></div>
        ) : (
          <div>
            {visibleGroups.map(function (group) {
              var hof = group.hof;
              return (
                <div key={hof.id} className="card" style={{ margin: "12px 0", padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>★ {hof.name}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>HOF · ITS {hof.its_number} · Family {hof.family_id} · {group.members.length + 1} member(s)</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={function () { setMuminPreview(hof); }}>View HOF</button>
                  </div>
                  <table>
                    <thead><tr><th></th><th>ITS No.</th><th>Name</th><th>Relation</th><th>Age</th><th>Gender</th><th>Phone</th><th>Sector</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      <tr className="clickable-row" onClick={function () { setMuminPreview(hof); }}>
                        <td><div className="mumin-avatar-sm">{hof.photo_url ? <img src={hof.photo_url} alt="" /> : (hof.name ? hof.name.charAt(0).toUpperCase() : "?")}</div></td>
                        <td><span className="file-no">{hof.its_number}</span></td>
                        <td style={{ fontWeight: 600 }}>{hof.name} <span style={{ color: "#c9a84c", fontSize: 11 }}>★ HOF</span></td>
                        <td>Head of Family</td><td>{getMuminAge(hof)}</td>
                        <td><span className={"badge badge-" + (hof.gender || "").toLowerCase()}>{hof.gender}</span></td>
                        <td style={{ fontSize: 12, color: "#9ca3af" }}>{hof.phone}</td><td style={{ fontSize: 12, color: "#c9a84c" }}>{hof.area_sector || "—"}</td>
                        <td><span className={"badge badge-" + (hof.status || "").toLowerCase()}>{hof.status}</span></td>
                        <td><div className="act-col" onClick={function (e) { e.stopPropagation(); }}>{canEdit && <button className="btn btn-ghost btn-sm" onClick={function () { openModal("mumin", "edit", hof); }}>Edit</button>}{canDelete && <button className="btn btn-danger" onClick={function () { deleteRecord("mumin", hof.id); }}>🗑</button>}</div></td>
                      </tr>
                      {group.members.map(function (m) {
                        return <tr key={m.id} className="clickable-row" onClick={function () { setMuminPreview(m); }}>
                          <td><div className="mumin-avatar-sm">{m.photo_url ? <img src={m.photo_url} alt="" /> : (m.name ? m.name.charAt(0).toUpperCase() : "?")}</div></td>
                          <td><span className="file-no">{m.its_number}</span></td><td style={{ fontWeight: 500, paddingLeft: 28 }}>↳ {m.name}</td>
                          <td>{m.spouse_its_id ? "Spouse linked" : "Family Member"}</td><td>{getMuminAge(m)}</td>
                          <td><span className={"badge badge-" + (m.gender || "").toLowerCase()}>{m.gender}</span></td>
                          <td style={{ fontSize: 12, color: "#9ca3af" }}>{m.phone}</td><td style={{ fontSize: 12, color: "#c9a84c" }}>{m.area_sector || "—"}</td>
                          <td><span className={"badge badge-" + (m.status || "").toLowerCase()}>{m.status}</span></td>
                          <td><div className="act-col" onClick={function (e) { e.stopPropagation(); }}>{canEdit && <button className="btn btn-ghost btn-sm" onClick={function () { openModal("mumin", "edit", m); }}>Edit</button>}{canDelete && <button className="btn btn-danger" onClick={function () { deleteRecord("mumin", m.id); }}>🗑</button>}</div></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
