import { useAppContext } from "../context/AppContext.jsx";
import { Spinner, UploadZone } from "../components/Shared.jsx";
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
        
        {/* Modal Header */}
        <div className="modal-hdr">
          <div className="modal-title">{modal.mode === "add" ? "Add" : "Edit"} Mumin Record</div>
          <button className="modal-close" onClick={closeModal}>×</button>
        </div>

        {/* Modal Form Body */}
        <div className="modal-body">
          <div className="form-grid">
            
            {/* ITS Number Input */}
            <div className="form-grp">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">ITS Number</label>
              <input 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full font-mono"
                value={form.its_number || ""} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { its_number: e.target.value }); }); }} 
                placeholder="e.g. 10001" 
              />
            </div>

            {/* Status Select dropdown */}
            <div className="form-grp">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Status</label>
              <select 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={form.status || "Active"} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { status: e.target.value }); }); }}
              >
                <option className="bg-brand-panel text-brand-text">Active</option>
                <option className="bg-brand-panel text-brand-text">Inactive</option>
              </select>
            </div>

            {/* Full Name Input */}
            <div className="form-grp full">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Full Name</label>
              <input 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={form.name || ""} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { name: e.target.value }); }); }} 
                placeholder="Enter full name" 
              />
            </div>

            {/* DOB & Age Indicator Input */}
            <div className="form-grp">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Date of Birth</label>
              <input 
                type="date" 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full text-slate-300"
                value={form.dob || ""} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { dob: e.target.value, age: calcAge(e.target.value) }); }); }} 
              />
              {form.dob && calcAge(form.dob) !== null && (
                <div className="text-[11px] text-brand-gold mt-1 font-medium">Age: {calcAge(form.dob)} years old</div>
              )}
            </div>

            {/* Gender Select dropdown */}
            <div className="form-grp">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Gender</label>
              <select 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={form.gender || "Male"} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { gender: e.target.value }); }); }}
              >
                <option className="bg-brand-panel text-brand-text">Male</option>
                <option className="bg-brand-panel text-brand-text">Female</option>
              </select>
            </div>

            {/* Phone Input */}
            <div className="form-grp">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Phone</label>
              <input 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={form.phone || ""} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { phone: e.target.value }); }); }} 
              />
            </div>

            {/* Email Input */}
            <div className="form-grp">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Email</label>
              <input 
                type="email"
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={form.email || ""} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { email: e.target.value }); }); }} 
              />
            </div>

            {/* Address Input */}
            <div className="form-grp full">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Address</label>
              <input 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={form.address || ""} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { address: e.target.value }); }); }} 
              />
            </div>

            {/* Area Sector Input */}
            <div className="form-grp full">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Area Sector</label>
              <input 
                list="area-sector-options" 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={form.area_sector || ""} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { area_sector: e.target.value, sub_sector_id: "" }); }); }} 
                placeholder="e.g. Sector A, Zone 1, etc." 
              />
              <datalist id="area-sector-options">
                {areaSectors.map(function (s) { return <option key={s} value={s} />; })}
              </datalist>
            </div>

            {/* Sub-Sector Selection Accordion Input */}
            {matchedSector && subs.length > 0 && (
              <div className="form-grp full">
                <label className="text-[11px] uppercase tracking-[1.5px] text-brand-gold font-medium mb-1">Sub-Sector (under {matchedSector.name})</label>
                <select 
                  className="bg-white/[0.04] border border-brand-gold/25 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/50 w-full"
                  value={form.sub_sector_id || ""} 
                  onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { sub_sector_id: e.target.value || null }); }); }}
                >
                  <option value="" className="bg-brand-panel text-brand-muted">&mdash; None &mdash;</option>
                  {subs.map(function (s) { return <option key={s.id} value={s.id} className="bg-brand-panel">{s.name}</option>; })}
                </select>
              </div>
            )}

            {/* Sabil No Input */}
            <div className="form-grp full">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Sabil No.</label>
              <input 
                list="sabil-no-options" 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full font-mono text-brand-gold-lite"
                value={form.sabil_no || ""} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { sabil_no: e.target.value }); }); }} 
                placeholder="e.g. 1024 (shared numbers group family household)" 
              />
              <datalist id="sabil-no-options">
                {sabilNos.map(function (s) { return <option key={s} value={s} />; })}
              </datalist>
            </div>

            {/* Profile Photo Uploader Module Component */}
            <div className="form-grp full mt-2">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-2 block">Profile Image File</label>
              
              {form.photo_url && !muminPhotoFile && (
                <div className="flex items-center gap-3 mb-3 bg-white/[0.02] p-2 rounded-xl border border-brand-gold/10 w-fit">
                  <img src={form.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-brand-gold/25" />
                  <button className="btn-ghost text-xs px-2.5 py-1 rounded-md" onClick={function () { setForm(function (f) { return Object.assign({}, f, { photo_url: null }); }); }}>Remove Photo</button>
                </div>
              )}
              
              {muminPhotoFile && (
                <div className="flex items-center gap-3 mb-3 bg-white/[0.02] p-2 rounded-xl border border-brand-gold/10 w-fit">
                  <img src={muminPhotoFile.dataUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-brand-gold/25" />
                  <span className="text-xs text-gray-400 max-w-[200px] truncate">{muminPhotoFile.name}</span>
                  <button className="btn-ghost text-xs px-2.5 py-1 rounded-md" onClick={function () { setMuminPhotoFile(null); }}>Cancel</button>
                </div>
              )}
              
              <UploadZone onFiles={function (files) { if (files[0]) setMuminPhotoFile(files[0]); }} uploading={uploadingPhoto} />
            </div>
          </div>
        </div>

        {/* Dynamic Form Alert Banners Error Layer */}
        {formErrors.length > 0 && (
          <div className="mx-6 mb-4 bg-brand-danger/8 border border-brand-danger/25 rounded-xl p-3">
            {formErrors.map(function (err, i) { return <div key={i} className="text-xs text-brand-danger py-0.5">⚠️ {err}</div>; })}
          </div>
        )}

        {formErrors.length === 0 && formWarnings.length > 0 && (
          <div className="mx-6 mb-4 bg-brand-warning/8 border border-brand-warning/25 rounded-xl p-3">
            {formWarnings.map(function (w, i) { return <div key={i} className="text-xs text-brand-warning py-0.5">🔔 {w}</div>; })}
          </div>
        )}

        {/* Modal Action Callout Footer Drawer */}
        <div className="modal-ftr">
          <button className="btn-ghost px-4 py-2 text-sm rounded-lg" onClick={closeModal} disabled={saving}>Cancel</button>
          {formWarnings.length > 0 && formErrors.length === 0 ? (
            <button className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-1.5" disabled={saving} onClick={function () { saveMumin(true); }}>
              {saving ? <span><Spinner /> Saving </span> : "Save Anyway"}
            </button>
          ) : (
            <button className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-1.5" disabled={saving} onClick={function () { saveMumin(); }}>
              {saving ? <span><Spinner /> Saving </span> : "Save to Cloud"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}