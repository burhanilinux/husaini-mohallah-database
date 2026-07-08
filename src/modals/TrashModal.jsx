import { useAppContext } from "../context/AppContext.jsx";

export function TrashModal() {
  var ctx = useAppContext();
  var trashModal = ctx.trashModal, setTrashModal = ctx.setTrashModal;
  var trashMumin = ctx.trashMumin, trashFiles = ctx.trashFiles;
  var restoring = ctx.restoring, isAdmin = ctx.isAdmin;
  var restoreRecord = ctx.restoreRecord, permanentDelete = ctx.permanentDelete;

  if (!trashModal) return null;

  return (
    <div className="modal-overlay" onClick={function () { setTrashModal(false); }}>
      <div className="ie-modal" onClick={function (e) { e.stopPropagation(); }}>
        <div className="modal-hdr">
          <div className="modal-title">🗑 Trash</div>
          <button className="modal-close" onClick={function () { setTrashModal(false); }}>×</button>
        </div>
        <div style={{ padding: "16px 0", maxHeight: "60vh", overflowY: "auto" }}>
          <div style={{ padding: "0 24px 8px", fontSize: 11, color: "#6b7280" }}>
            Deleted records are kept here until permanently removed. Restore or delete them for good.
          </div>

          <div className="sec-lbl" style={{ padding: "8px 24px 0" }}>Mumin Records ({trashMumin.length})</div>
          {trashMumin.length === 0 ? (
            <div style={{ padding: "12px 24px", fontSize: 12, color: "#4b5563" }}>No deleted Mumin records.</div>
          ) : trashMumin.map(function (m) {
            return (
              <div className="trash-item" key={m.id} style={{ padding: "10px 24px" }}>
                <div>
                  <div className="trash-info">{m.name} <span style={{ color: "#6b7280", fontSize: 11 }}>({m.its_number})</span></div>
                  <div className="trash-meta">Deleted: {new Date(m.deleted_at).toLocaleString()}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" disabled={restoring} onClick={function () { restoreRecord("mumin", m); }}>Restore</button>
                  {isAdmin && <button className="btn btn-danger" disabled={restoring} onClick={function () { permanentDelete("mumin", m); }}>Delete Forever</button>}
                </div>
              </div>
            );
          })}

          <div className="sec-lbl" style={{ padding: "16px 24px 0" }}>Umoor Files ({trashFiles.length})</div>
          {trashFiles.length === 0 ? (
            <div style={{ padding: "12px 24px", fontSize: 12, color: "#4b5563" }}>No deleted files.</div>
          ) : trashFiles.map(function (f) {
            return (
              <div className="trash-item" key={f.id} style={{ padding: "10px 24px" }}>
                <div>
                  <div className="trash-info">{f.title} <span style={{ color: "#6b7280", fontSize: 11 }}>({f.file_no})</span></div>
                  <div className="trash-meta">Deleted: {new Date(f.deleted_at).toLocaleString()}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" disabled={restoring} onClick={function () { restoreRecord("file", f); }}>Restore</button>
                  {isAdmin && <button className="btn btn-danger" disabled={restoring} onClick={function () { permanentDelete("file", f); }}>Delete Forever</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
