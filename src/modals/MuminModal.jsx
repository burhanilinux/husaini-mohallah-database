import { useAppContext } from "../context/AppContext.jsx";
import { Spinner, UploadZone, PhotoThumb } from "../components/Shared.jsx";
import { calcAge } from "../lib/utils.js";

export function MuminModal() {
  var ctx = useAppContext();
  var modal = ctx.modal, closeModal = ctx.closeModal, saving = ctx.saving;
  var form = ctx.form, setForm = ctx.setForm, formErrors = ctx.formErrors;
  var formWarnings = ctx.formWarnings;
  var areaSectors = ctx.areaSectors, sabilNos = ctx.sabilNos;
  var sectorsData = ctx.sectorsData, getSubSectorsFor = ctx.getSubSectorsFor;
  var muminPhotoFile = ctx.muminPhotoFile, setMuminPhotoFile = ctx.setMuminPhotoFile;
  var uploadingPhoto = ctx.uploadingPhoto, saveMumin = ctx.saveMumin;

  if (!modal || modal.type !== "mumin") return null;

  var matchedSector = sectorsData.find(function (s) { return s.name === form.area_sector; });
  var subs = matchedSector ? getSubSectorsFor(matchedSector.id) : [];

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal" onClick={function (e) { e.stopPropagation(); }}>
        <div className="modal-hdr">
          <div className="modal-title">{modal.mode === "add" ? "Add" : "Edit"} Mumin Record</div>
          <button className="modal-close" onClick={closeModal}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-grp">
              <label>ITS Number</label>
              <input value={form.its_number || ""} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { its_number: e.target.value }); }); }} placeholder="e.g. 10001" />
            </div>
            <div className="form-grp">
              <label>Status</label>
              <select value={form.status || "Active"} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { status: e.target.value }); }); }}>
                <option>Active</option><option>Inactive</option>
              </select>
            </div>
            <div className="form-grp full">
              <label>Full Name</label>
              <input value={form.name || ""} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { name: e.target.value }); }); }} placeholder="Enter full name" />
            </div>
            <div className="form-grp">
              <label>Date of Birth</label>
              <input type="date" value={form.dob || ""} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { dob: e.target.value, age: calcAge(e.target.value) }); }); }} />
              {form.dob && calcAge(form.dob) !== null && (
                <div style={{ fontSize: 11, color: "#c9a84c", marginTop: 4 }}>Age: {calcAge(form.dob)} years</div>
              )}
            </div>
            <div className="form-grp">
              <label>Gender</label>
              <select value={form.gender || "Male"} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { gender: e.target.value }); }); }}>
                <option>Male</option><option>Female</option>
              </select>
            </div>
            <div className="form-grp">
              <label>Phone</label>
              <input value={form.phone || ""} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { phone: e.target.value }); }); }} />
            </div>
            <div className="form-grp">
              <label>Email</label>
              <input value={form.email || ""} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { email: e.target.value }); }); }} />
            </div>
            <div className="form-grp full">
              <label>Address</label>
              <input value={form.address || ""} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { address: e.target.value }); }); }} />
            </div>
            <div className="form-grp full">
              <label>Area Sector</label>
              <input list="area-sector-options" value={form.area_sector || ""} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { area_sector: e.target.value, sub_sector_id: "" }); }); }} placeholder="e.g. Sector A, Zone 1, etc." />
              <datalist id="area-sector-options">
                {areaSectors.map(function (s) { return <option key={s} value={s} />; })}
              </datalist>
            </div>
            {matchedSector && subs.length > 0 && (
              <div className="form-grp full">
                <label>Sub-Sector (under {matchedSector.name})</label>
                <select value={form.sub_sector_id || ""} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { sub_sector_id: e.target.value || null }); }); }}>
                  <option value="">— None —</option>
                  {subs.map(function (s) { return <option key={s.id} value={s.id}>{s.name}</option>; })}
                </select>
              </div>
            )}
            <div className="form-grp full">
              <label>Sabil No.</label>
              <input list="sabil-no-options" value={form.sabil_no || ""} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { sabil_no: e.target.value }); }); }} placeholder="e.g. 1024 — same number groups family members" />
              <datalist id="sabil-no-options">
                {sabilNos.map(function (s) { return <option key={s} value={s} />; })}
              </datalist>
            </div>
            <div className="form-grp full">
              <label>Profile Photo</label>
              {form.photo_url && !muminPhotoFile && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <PhotoThumb url={form.photo_url} style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(184,152,90,.25)" }} />
                  <button className="btn btn-ghost btn-sm" onClick={function () { setForm(function (f) { return Object.assign({}, f, { photo_url: null }); }); }}>Remove Photo</button>
                </div>
              )}
              {muminPhotoFile && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <img src={muminPhotoFile.dataUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", border: "1px solid rgba(184,152,90,.25)" }} />
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{muminPhotoFile.name}</span>
                  <button className="btn btn-ghost btn-sm" onClick={function () { setMuminPhotoFile(null); }}>Cancel</button>
                </div>
              )}
              <UploadZone onFiles={function (files) { if (files[0]) setMuminPhotoFile(files[0]); }} uploading={uploadingPhoto} />
            </div>
          </div>
        </div>
        {formErrors.length > 0 && (
          <div className="form-err-box">
            {formErrors.map(function (err, i) { return <div key={i} className="form-err-line">⚠ {err}</div>; })}
          </div>
        )}
        {formErrors.length === 0 && formWarnings.length > 0 && (
          <div className="form-err-box" style={{ background: "rgba(251,191,36,.08)", borderColor: "rgba(251,191,36,.3)" }}>
            {formWarnings.map(function (w, i) { return <div key={i} className="form-err-line" style={{ color: "#fbbf24" }}>⚠ {w}</div>; })}
          </div>
        )}
        <div className="modal-ftr">
          <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>Cancel</button>
          {formWarnings.length > 0 && formErrors.length === 0 ? (
            <button className="btn btn-primary" disabled={saving} onClick={function () { saveMumin(true); }}>
              {saving ? <span><Spinner /> Saving…</span> : "Save Anyway ☁"}
            </button>
          ) : (
            <button className="btn btn-primary" disabled={saving} onClick={function () { saveMumin(); }}>
              {saving ? <span><Spinner /> Saving…</span> : "Save to Cloud ☁"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
