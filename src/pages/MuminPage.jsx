import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import { getMuminAge } from "../lib/utils.js";

export function MuminPage() {
  var ctx = useAppContext();
  var muminData = ctx.muminData || [];
  var loading = ctx.loading;
  var canEdit = ctx.canEdit, canDelete = ctx.canDelete;
  var openModal = ctx.openModal, loadAll = ctx.loadAll;
  var search = ctx.search || "", setSearch = ctx.setSearch;
  var selSector = ctx.selSector, setSelSector = ctx.setSelSector;
  var areaSectors = ctx.areaSectors || [];
  var setMuminPreview = ctx.setMuminPreview, deleteRecord = ctx.deleteRecord;

  // Build family trees from the source HOF_ID, not family_id.
  // The imported dataset can contain a member's Family_ID that differs from
  // the HOF's Family_ID, while HOF_ID remains the authoritative family link.
  // Example: Mustafa bhai Alihusain bhai Chechatwala (30313998) has
  // Family_ID 30313998 but HOF_ID 30313997 (Hafiza bai).
  var byHof = {};
  var hofWithoutFamily = [];
  var hofByIts = {};

  muminData.forEach(function (m) {
    if (m.deleted_at) return;
    hofByIts[String(m.its_id || m.its_number || "")] = m;
  });

  muminData.forEach(function (m) {
    if (m.deleted_at) return;
    var source = m.source_data || {};
    var hofId = String(source.HOF_ID || "").trim();
    var isHof = String(source.HOF_FM_TYPE || "").toUpperCase() === "HOF";

    // Prefer the source HOF_ID. Fall back to family_id for older/manual records.
    var key = hofId || (m.family_id === null || m.family_id === undefined || String(m.family_id).trim() === ""
      ? "" : String(m.family_id).trim());

    if (!key) {
      if (isHof) hofWithoutFamily.push({ hof: m, members: [] });
      return;
    }

    if (!byHof[key]) byHof[key] = { hof: null, members: [] };
    if (isHof || String(m.its_id || m.its_number) === key) {
      byHof[key].hof = m;
    } else {
      byHof[key].members.push(m);
    }
  });

  // Resolve the HOF directly by HOF_ID when the HOF record is stored with a
  // different family_id from its members.
  Object.keys(byHof).forEach(function (key) {
    if (!byHof[key].hof && hofByIts[key]) {
      byHof[key].hof = hofByIts[key];
    }
  });

  var grouped = Object.keys(byHof).map(function (key) {
    var group = byHof[key];
    return group.hof ? { familyId: group.hof.family_id || key, hof: group.hof, members: group.members } : null;
  }).filter(Boolean);

  hofWithoutFamily.forEach(function (g) {
    grouped.push({ familyId: null, hof: g.hof, members: [] });
  });

  grouped.sort(function (a, b) {
    return String(a.hof.name || "").localeCompare(String(b.hof.name || ""));
  });

  var q = search.trim().toLowerCase();
  var visibleGroups = grouped.filter(function (group) {
    // Sector filtering is based on the HOF. Searching a family member still
    // returns the complete HOF family tree, so members are never hidden because
    // their own Family_ID differs from the HOF's Family_ID.
    if (selSector && group.hof.area_sector !== selSector) return false;
    if (!q) return true;

    var hof = group.hof;
    if (String(hof.name || "").toLowerCase().indexOf(q) >= 0 ||
        String(hof.its_number || hof.its_id || "").indexOf(q) >= 0) return true;

    return group.members.some(function (m) {
      return String(m.name || "").toLowerCase().indexOf(q) >= 0 ||
        String(m.its_number || m.its_id || "").indexOf(q) >= 0;
    });
  });

  var visibleMemberCount = visibleGroups.reduce(function (total, group) {
    return total + group.members.length + 1;
  }, 0);

  return (
    <div>
      <div className="page-hdr">
        <div className="page-title">Mumin Data</div>
        <div className="page-sub">Heads of Family with their linked family members</div>
      </div>
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">Heads of Family ({visibleGroups.length}) · {visibleMemberCount} members</span>
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
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                        HOF · ITS {hof.its_number} · Family {hof.family_id || "—"} · {group.members.length + 1} member(s)
                      </div>
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
