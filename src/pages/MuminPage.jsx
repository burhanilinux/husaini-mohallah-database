import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import { getMuminAge } from "../lib/utils.js";

function norm(v) { return String(v ?? "").trim(); }
function isHof(m) { return norm(m?.source_data?.HOF_FM_TYPE).toUpperCase() === "HOF"; }
function hofIdOf(m) { return norm(m?.source_data?.HOF_ID); }
function itsOf(m) { return norm(m?.its_id || m?.its_number); }

// Build lossless family trees. HOF_ID is authoritative; Family_ID is only a
// fallback for records that genuinely have no usable HOF_ID. Every database
// record is assigned to exactly one group or to the visible unlinked list.
function buildFamilyGroups(muminData) {
  var rows = muminData.filter(function (m) { return !m.deleted_at; });
  var byIts = {};
  var groups = {};
  var unlinked = [];

  rows.forEach(function (m) { var id = itsOf(m); if (id) byIts[id] = m; });

  function ensure(key, hof) {
    if (!groups[key]) groups[key] = { key: key, hof: hof || null, members: [], seen: {} };
    if (hof && !groups[key].hof) groups[key].hof = hof;
    return groups[key];
  }

  function add(key, hof, member) {
    var g = ensure(key, hof);
    var id = itsOf(member);
    if (id && !g.seen[id]) { g.seen[id] = true; g.members.push(member); }
  }

  // First pass: establish every HOF group, regardless of Family_ID.
  rows.filter(isHof).forEach(function (hof) {
    var id = itsOf(hof);
    if (id) add("hof:" + id, hof, hof);
  });

  rows.forEach(function (m) {
    if (isHof(m)) return;
    var hofId = hofIdOf(m);
    var familyId = norm(m.family_id);

    // HOF_ID is the authoritative source relationship.
    if (hofId && byIts[hofId] && isHof(byIts[hofId])) {
      add("hof:" + hofId, byIts[hofId], m);
      return;
    }

    // Safe fallback for legacy/manual records with no HOF_ID.
    if (!hofId && familyId) {
      var fallback = rows.find(function (r) { return isHof(r) && norm(r.family_id) === familyId; });
      if (fallback) {
        add("hof:" + itsOf(fallback), fallback, m);
        return;
      }
    }

    // Never silently drop a member.
    unlinked.push(m);
  });

  var grouped = Object.keys(groups).map(function (key) {
    var g = groups[key];
    return {
      familyId: g.hof ? (g.hof.family_id || key.replace("hof:", "")) : null,
      hof: g.hof,
      members: g.members.filter(function (m) { return itsOf(m) !== itsOf(g.hof); })
        .sort(function (a, b) { return itsOf(a).localeCompare(itsOf(b)); })
    };
  }).filter(function (g) { return !!g.hof; });

  grouped.sort(function (a, b) { return String(a.hof.name || "").localeCompare(String(b.hof.name || "")); });
  return { grouped: grouped, unlinked: unlinked };
}

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

  var familyData = buildFamilyGroups(muminData);
  var grouped = familyData.grouped;
  var unlinked = familyData.unlinked;

  var q = search.trim().toLowerCase();
  var visibleGroups = grouped.filter(function (group) {
    if (selSector && group.hof.area_sector !== selSector) return false;
    if (!q) return true;
    var hof = group.hof;
    if (String(hof.name || "").toLowerCase().indexOf(q) >= 0 || String(hof.its_number || hof.its_id || "").indexOf(q) >= 0) return true;
    return group.members.some(function (m) {
      return String(m.name || "").toLowerCase().indexOf(q) >= 0 || String(m.its_number || m.its_id || "").indexOf(q) >= 0;
    });
  });

  var visibleMemberCount = visibleGroups.reduce(function (total, group) { return total + group.members.length + 1; }, 0);
  var visibleUnlinked = unlinked.filter(function (m) {
    if (!q) return true;
    return [m.name, m.its_number, m.its_id, m.family_id, hofIdOf(m)].map(norm).join(" ").toLowerCase().indexOf(q) >= 0;
  });

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
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>HOF · ITS {hof.its_number} · Family {hof.family_id || "—"} · {group.members.length + 1} member(s)</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={function () { setMuminPreview(hof); }}>View HOF</button>
                  </div>
                  <table>
                    <thead><tr><th></th><th>ITS No.</th><th>Name</th><th>Relation</th><th>Age</th><th>Gender</th><th>Phone</th><th>Sector</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      <tr className="clickable-row" onClick={function () { setMuminPreview(hof); }}>
                        <td><div className="mumin-avatar-sm">{hof.photo_url ? <img src={hof.photo_url} alt="" /> : (hof.name ? hof.name.charAt(0).toUpperCase() : "?")}</div></td>
                        <td><span className="file-no">{hof.its_number}</span></td><td style={{ fontWeight: 600 }}>{hof.name} <span style={{ color: "#c9a84c", fontSize: 11 }}>★ HOF</span></td>
                        <td>Head of Family</td><td>{getMuminAge(hof)}</td><td><span className={"badge badge-" + (hof.gender || "").toLowerCase()}>{hof.gender}</span></td>
                        <td style={{ fontSize: 12, color: "#9ca3af" }}>{hof.phone}</td><td style={{ fontSize: 12, color: "#c9a84c" }}>{hof.area_sector || "—"}</td>
                        <td><span className={"badge badge-" + (hof.status || "").toLowerCase()}>{hof.status}</span></td>
                        <td><div className="act-col" onClick={function (e) { e.stopPropagation(); }}>{canEdit && <button className="btn btn-ghost btn-sm" onClick={function () { openModal("mumin", "edit", hof); }}>Edit</button>}{canDelete && <button className="btn btn-danger" onClick={function () { deleteRecord("mumin", hof.id); }}>🗑</button>}</div></td>
                      </tr>
                      {group.members.map(function (m) {
                        return <tr key={m.id} className="clickable-row" onClick={function () { setMuminPreview(m); }}>
                          <td><div className="mumin-avatar-sm">{m.photo_url ? <img src={m.photo_url} alt="" /> : (m.name ? m.name.charAt(0).toUpperCase() : "?")}</div></td>
                          <td><span className="file-no">{m.its_number}</span></td><td style={{ fontWeight: 500, paddingLeft: 28 }}>↳ {m.name}</td>
                          <td>{m.spouse_its_id ? "Spouse linked" : "Family Member"}</td><td>{getMuminAge(m)}</td><td><span className={"badge badge-" + (m.gender || "").toLowerCase()}>{m.gender}</span></td>
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
        {visibleUnlinked.length > 0 && <div className="card" style={{ marginTop: 16 }}>
          <div className="card-hdr"><span className="card-title">Unlinked Family Records ({visibleUnlinked.length})</span></div>
          <div style={{ padding: "0 16px 12px", color: "#9ca3af", fontSize: 12 }}>These records have no valid HOF_ID and no matching HOF Family_ID. They are shown here instead of being silently omitted.</div>
          <table><thead><tr><th>ITS No.</th><th>Name</th><th>Family ID</th><th>HOF ID</th><th>Sector</th></tr></thead><tbody>
            {visibleUnlinked.map(function (m) { return <tr key={m.id}><td><span className="file-no">{m.its_number}</span></td><td>{m.name}</td><td>{m.family_id || "—"}</td><td>{hofIdOf(m) || "—"}</td><td>{m.area_sector || "—"}</td></tr>; })}
          </tbody></table>
        </div>}
      </div>
    </div>
  );
}
