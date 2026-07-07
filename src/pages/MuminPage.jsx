import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import { getMuminAge } from "../lib/utils.js";

export function MuminPage() {
  var ctx = useAppContext();
  var filteredMumin = ctx.filteredMumin, loading = ctx.loading;
  var canEdit = ctx.canEdit, canDelete = ctx.canDelete;
  var openModal = ctx.openModal, loadAll = ctx.loadAll;
  var search = ctx.search, setSearch = ctx.setSearch;
  var selSector = ctx.selSector, setSelSector = ctx.setSelSector;
  var areaSectors = ctx.areaSectors;
  var setMuminPreview = ctx.setMuminPreview, deleteRecord = ctx.deleteRecord;

  return (
    <div>
      <div className="page-hdr">
        <div className="page-title">Mumin Data</div>
        <div className="page-sub">Registered members</div>
      </div>
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">Members ({filteredMumin.length})</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={loadAll}>{loading ? <Spinner /> : "↻"}</button>
            {canEdit && <button className="btn btn-primary" onClick={function () { openModal("mumin", "add"); }}>+ Add Mumin</button>}
          </div>
        </div>
        <div className="toolbar">
          <input style={{ width: 260 }} placeholder="Search by name or ITS…" value={search} onChange={function (e) { setSearch(e.target.value); }} />
          <select value={selSector || ""} onChange={function (e) { setSelSector(e.target.value || null); }} style={{ width: 200 }}>
            <option value="">All Sectors</option>
            {areaSectors.map(function (s) { return <option key={s} value={s}>{s}</option>; })}
          </select>
        </div>
        {loading ? <div className="loading"><Spinner /> Loading…</div> : filteredMumin.length === 0 ? (
          <div className="empty"><div className="empty-icon">👤</div><div>No records found</div></div>
        ) : (
          <table>
            <thead>
              <tr><th></th><th>ITS No.</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Address</th><th>Sector</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredMumin.map(function (m) {
                return (
                  <tr key={m.id} className="clickable-row" onClick={function () { setMuminPreview(m); }}>
                    <td style={{ width: 38 }}>
                      <div className="mumin-avatar-sm">
                        {m.photo_url ? <img src={m.photo_url} alt="" /> : (m.name ? m.name.charAt(0).toUpperCase() : "?")}
                      </div>
                    </td>
                    <td><span className="file-no">{m.its_number}</span></td>
                    <td style={{ fontWeight: 500 }}>{m.name}</td>
                    <td>{getMuminAge(m)}</td>
                    <td><span className={"badge badge-" + (m.gender || "").toLowerCase()}>{m.gender}</span></td>
                    <td style={{ fontSize: 12, color: "#9ca3af" }}>{m.phone}</td>
                    <td style={{ fontSize: 12, color: "#6b7280" }}>{m.address}</td>
                    <td style={{ fontSize: 12, color: "#c9a84c" }}>{m.area_sector || "—"}</td>
                    <td><span className={"badge badge-" + (m.status || "").toLowerCase()}>{m.status}</span></td>
                    <td>
                      <div className="act-col" onClick={function (e) { e.stopPropagation(); }}>
                        {canEdit && <button className="btn btn-ghost btn-sm" onClick={function () { openModal("mumin", "edit", m); }}>Edit</button>}
                        {canDelete && <button className="btn btn-danger" onClick={function () { deleteRecord("mumin", m.id); }}>🗑</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
