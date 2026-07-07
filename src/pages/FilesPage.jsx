import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import { YEARS, UMOOR_TYPES } from "../lib/constants.js";

export function FilesPage() {
  var ctx = useAppContext();
  var selYear = ctx.selYear, setSelYear = ctx.setSelYear;
  var canEdit = ctx.canEdit, canDelete = ctx.canDelete;
  var openModal = ctx.openModal, loadAll = ctx.loadAll, loading = ctx.loading;
  var search = ctx.search, setSearch = ctx.setSearch;
  var selUmoor = ctx.selUmoor, setSelUmoor = ctx.setSelUmoor;
  var filteredFiles = ctx.filteredFiles, getFileAtts = ctx.getFileAtts;
  var setFilePreview = ctx.setFilePreview, deleteRecord = ctx.deleteRecord;

  return (
    <div>
      <div className="page-hdr">
        <div className="page-title">Umoor Files</div>
        <div className="page-sub">Documents, scans and records</div>
      </div>

      <div className="year-tabs">
        <button className={"year-tab" + (!selYear ? " active" : "")} onClick={function () { setSelYear(null); }}>All Years</button>
        {YEARS.map(function (y) {
          return <button key={y} className={"year-tab" + (selYear === y ? " active" : "")} onClick={function () { setSelYear(y); }}>{y}</button>;
        })}
      </div>

      <div className="card">
        <div className="card-hdr">
          <span className="card-title">Files ({filteredFiles.length})</span>
          {canEdit && <button className="btn btn-primary" onClick={function () { openModal("file", "add"); }}>+ New File</button>}
        </div>
        <div className="toolbar">
          <input style={{ width: 220 }} placeholder="Search files…" value={search} onChange={function (e) { setSearch(e.target.value); }} />
          <select value={selUmoor || ""} onChange={function (e) { setSelUmoor(e.target.value || null); }} style={{ width: 220 }}>
            <option value="">All Umoor</option>
            {UMOOR_TYPES.map(function (u) { return <option key={u} value={u}>{u}</option>; })}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={loadAll}>{loading ? <Spinner /> : "↻"}</button>
        </div>
        {loading ? <div className="loading"><Spinner /> Loading…</div> : filteredFiles.length === 0 ? (
          <div className="empty"><div className="empty-icon">🗂</div><div>No files found</div></div>
        ) : (
          <table>
            <thead>
              <tr><th>File No.</th><th>Title</th><th>Umoor</th><th>Year</th><th>Date</th><th>Due Date</th><th>Attachments</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredFiles.map(function (f) {
                var atts = getFileAtts(f.id);
                return (
                  <tr key={f.id} className="clickable-row" onClick={function () { setFilePreview(f); }}>
                    <td><span className="file-no">{f.file_no}</span></td>
                    <td style={{ fontWeight: 500 }}>{f.title}</td>
                    <td style={{ fontSize: 12, color: "#9ca3af" }}>{f.umoor_type}</td>
                    <td>{f.year}</td>
                    <td style={{ fontSize: 12, color: "#6b7280" }}>{f.date}</td>
                    <td>{f.due_date ? (function () {
                      var d = new Date(f.due_date); var t = new Date(); t.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
                      var diff = (d - t) / (1000 * 60 * 60 * 24);
                      var cls = diff < 0 ? "rb-overdue" : diff <= 7 ? "rb-soon" : "";
                      return <span className={"reminder-badge " + cls} style={{ fontSize: 10 }}>{f.due_date}</span>;
                    })() : <span style={{ color: "#4b5563", fontSize: 12 }}>—</span>}</td>
                    <td>{atts.length > 0 ? <span className="attach-chip">📎 {atts.length}</span> : <span style={{ color: "#4b5563", fontSize: 12 }}>—</span>}</td>
                    <td><span className={"badge badge-" + (f.status || "").toLowerCase()}>{f.status}</span></td>
                    <td>
                      <div className="act-col" onClick={function (e) { e.stopPropagation(); }}>
                        {canEdit && <button className="btn btn-ghost btn-sm" onClick={function () { openModal("file", "edit", f); }}>Edit</button>}
                        {canDelete && <button className="btn btn-danger" onClick={function () { deleteRecord("file", f.id); }}>🗑</button>}
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
