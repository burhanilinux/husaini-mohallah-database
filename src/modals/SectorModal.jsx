import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";

export function SectorModal() {
  var ctx = useAppContext();
  var sectorModal = ctx.sectorModal, closeSectorModal = ctx.closeSectorModal;
  var sectorForm = ctx.sectorForm, setSectorForm = ctx.setSectorForm;
  var saving = ctx.saving, saveSector = ctx.saveSector;
  var muminData = ctx.muminData, getMuminByIts = ctx.getMuminByIts;

  if (!sectorModal) return null;

  return (
    <div className="modal-overlay" onClick={closeSectorModal}>
      <div className="modal" onClick={function (e) { e.stopPropagation(); }}>
        <div className="modal-hdr">
          <div className="modal-title">{sectorModal.mode === "add" ? "New Sector" : "Edit Sector"}</div>
          <button className="modal-close" onClick={closeSectorModal}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-grp full">
              <label>Sector Name</label>
              <input value={sectorForm.name || ""} onChange={function (e) { setSectorForm(function (f) { return Object.assign({}, f, { name: e.target.value }); }); }} placeholder="e.g. Sector A" />
            </div>
            <div className="form-grp full">
              <div className="sec-lbl" style={{ marginBottom: 8 }}>Masool (Sector Head)</div>
            </div>
            <div className="form-grp full">
              <label>Select Existing Mumin (optional)</label>
              <select
                value={sectorForm.masool_its || ""}
                onChange={function (e) {
                  setSectorForm(function (f) {
                    return Object.assign({}, f, {
                      masool_its: e.target.value,
                      masool_name: "",
                      masool_phone: e.target.value ? (getMuminByIts(e.target.value) ? getMuminByIts(e.target.value).phone : "") : f.masool_phone,
                    });
                  });
                }}
              >
                <option value="">— Type name manually instead —</option>
                {muminData.map(function (m) { return <option key={m.id} value={m.its_number}>{m.name} ({m.its_number})</option>; })}
              </select>
            </div>
            {!sectorForm.masool_its && (
              <div className="form-grp full">
                <label>Or Type Masool Name</label>
                <input value={sectorForm.masool_name || ""} onChange={function (e) { setSectorForm(function (f) { return Object.assign({}, f, { masool_name: e.target.value }); }); }} placeholder="Masool full name" />
              </div>
            )}
            <div className="form-grp full">
              <label>Masool Phone</label>
              <input value={sectorForm.masool_phone || ""} onChange={function (e) { setSectorForm(function (f) { return Object.assign({}, f, { masool_phone: e.target.value }); }); }} placeholder="Phone number" />
            </div>
          </div>
        </div>
        <div className="modal-ftr">
          <button className="btn btn-ghost" onClick={closeSectorModal} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={saveSector}>{saving ? <span><Spinner /> Saving…</span> : "Save Sector ☁"}</button>
        </div>
      </div>
    </div>
  );
}
