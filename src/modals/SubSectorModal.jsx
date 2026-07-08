import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";

export function SubSectorModal() {
  var ctx = useAppContext();
  var subSectorModal = ctx.subSectorModal, closeSubSectorModal = ctx.closeSubSectorModal;
  var subSectorForm = ctx.subSectorForm, setSubSectorForm = ctx.setSubSectorForm;
  var saving = ctx.saving, saveSubSector = ctx.saveSubSector;
  var muminData = ctx.muminData, getMuminByIts = ctx.getMuminByIts;

  if (!subSectorModal) return null;

  return (
    <div className="modal-overlay" onClick={closeSubSectorModal}>
      <div className="modal" onClick={function (e) { e.stopPropagation(); }}>
        <div className="modal-hdr">
          <div className="modal-title">{subSectorModal.mode === "add" ? "New Sub-Sector" : "Edit Sub-Sector"}</div>
          <button className="modal-close" onClick={closeSubSectorModal}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-grp full">
              <label>Sub-Sector Name</label>
              <input value={subSectorForm.name || ""} onChange={function (e) { setSubSectorForm(function (f) { return Object.assign({}, f, { name: e.target.value }); }); }} placeholder="e.g. Sub-Sector A1" />
            </div>
            <div className="form-grp full">
              <div className="sec-lbl" style={{ marginBottom: 8 }}>Musaid (Sub-Sector Assistant)</div>
            </div>
            <div className="form-grp full">
              <label>Select Existing Mumin (optional)</label>
              <select
                value={subSectorForm.musaid_its || ""}
                onChange={function (e) {
                  setSubSectorForm(function (f) {
                    return Object.assign({}, f, {
                      musaid_its: e.target.value,
                      musaid_name: "",
                      musaid_phone: e.target.value ? (getMuminByIts(e.target.value) ? getMuminByIts(e.target.value).phone : "") : f.musaid_phone,
                    });
                  });
                }}
              >
                <option value="">— Type name manually instead —</option>
                {muminData.map(function (m) { return <option key={m.id} value={m.its_number}>{m.name} ({m.its_number})</option>; })}
              </select>
            </div>
            {!subSectorForm.musaid_its && (
              <div className="form-grp full">
                <label>Or Type Musaid Name</label>
                <input value={subSectorForm.musaid_name || ""} onChange={function (e) { setSubSectorForm(function (f) { return Object.assign({}, f, { musaid_name: e.target.value }); }); }} placeholder="Musaid full name" />
              </div>
            )}
            <div className="form-grp full">
              <label>Musaid Phone</label>
              <input value={subSectorForm.musaid_phone || ""} onChange={function (e) { setSubSectorForm(function (f) { return Object.assign({}, f, { musaid_phone: e.target.value }); }); }} placeholder="Phone number" />
            </div>
          </div>
        </div>
        <div className="modal-ftr">
          <button className="btn btn-ghost" onClick={closeSubSectorModal} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={saveSubSector}>{saving ? <span><Spinner /> Saving…</span> : "Save Sub-Sector ☁"}</button>
        </div>
      </div>
    </div>
  );
}
