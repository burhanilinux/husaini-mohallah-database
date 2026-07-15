import { useAppContext } from "../context/AppContext.jsx";
import { Spinner, UploadZone, AttList } from "../components/Shared.jsx";
import { YEARS, UMOOR_TYPES, currentYear } from "../lib/constants.js";
import { getUmoorPrefix } from "../lib/utils.js";

export function FileModal() {
  var ctx = useAppContext();
  var modal = ctx.modal, closeModal = ctx.closeModal, saving = ctx.saving;
  var form = ctx.form, setForm = ctx.setForm, formErrors = ctx.formErrors;
  var formAtts = ctx.formAtts, setFormAtts = ctx.setFormAtts;
  var uploading = ctx.uploading, setLightbox = ctx.setLightbox;
  var saveFile = ctx.saveFile;

  if (!modal || modal.type !== "file") return null;

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal" onClick={function (e) { e.stopPropagation(); }}>
        
        {/* Modal Header */}
        <div className="modal-hdr">
          <div className="modal-title">{modal.mode === "add" ? "Add" : "Edit"} Umoor File</div>
          <button className="modal-close" onClick={closeModal}>×</button>
        </div>

        {/* Modal Form Body */}
        <div className="modal-body">
          <div className="form-grid">
            
            {/* Year Input dropdown */}
            <div className="form-grp">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Year</label>
              <select 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={form.year || 2026} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { year: Number(e.target.value) }); }); }}
              >
                {YEARS.map(function (y) { return <option key={y} className="bg-brand-panel text-brand-text">{y}</option>; })}
              </select>
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
                <option className="bg-brand-panel text-brand-text">Closed</option>
                <option className="bg-brand-panel text-brand-text">Pending</option>
              </select>
            </div>

            {/* Umoor Department Select dropdown */}
            <div className="form-grp full">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Umoor Type</label>
              <select 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={form.umoor_type || ""} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { umoor_type: e.target.value }); }); }}
              >
                <option value="" className="bg-brand-panel text-brand-muted">Select Umoor Department</option>
                {UMOOR_TYPES.map(function (u) { return <option key={u} className="bg-brand-panel text-brand-text">{u}</option>; })}
              </select>
            </div>

            {/* File Title Input */}
            <div className="form-grp full">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">File Title</label>
              <input 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={form.title || ""} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { title: e.target.value }); }); }} 
                placeholder="Enter file title" 
              />
            </div>

            {/* Record Creation Date Picker */}
            <div className="form-grp">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Date</label>
              <input 
                type="date" 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full text-slate-300"
                value={form.date || ""} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { date: e.target.value }); }); }} 
              />
            </div>

            {/* Custom Token Mask File Number Input */}
            <div className="form-grp">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">File No. (auto if blank)</label>
              <input 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full font-mono text-brand-gold-lite"
                value={form.file_no || ""} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { file_no: e.target.value }); }); }} 
                placeholder={"HM-" + getUmoorPrefix(form.umoor_type || "") + "-" + (form.year || currentYear) + "-XXX"} 
              />
            </div>

            {/* Description Textarea Area */}
            <div className="form-grp full">
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Description</label>
              <textarea 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full min-h-[72px] resize-y"
                value={form.description || ""} 
                onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { description: e.target.value }); }); }} 
                placeholder="Notes or description details..." 
              />
            </div>
          </div>

          {/* Attachments Section Layer */}
          <div className="h-px bg-brand-gold/10 my-5" />
          <div className="text-[11px] uppercase tracking-[2px] text-brand-gold font-semibold mb-3">📁 Attachments &mdash; Scans and Photos</div>
          
          <UploadZone onFiles={function (files) { setFormAtts(function (a) { return a.concat(files); }); }} uploading={uploading} />
          
          <AttList
            atts={formAtts}
            onRemove={function (i) { setFormAtts(function (a) { return a.filter(function (_, idx) { return idx !== i; }); }); }}
            onView={function (a) { setLightbox({ url: a.url || a.dataUrl, name: a.name }); }}
          />
        </div>

        {/* Form Error Message Overlay Banners */}
        {formErrors.length > 0 && (
          <div className="mx-6 mb-4 bg-brand-danger/8 border border-brand-danger/25 rounded-xl p-3">
            {formErrors.map(function (err, i) { return <div key={i} className="text-xs text-brand-danger py-0.5">⚠️ {err}</div>; })}
          </div>
        )}

        {/* Modal Action Callout Footer Drawer */}
        <div className="modal-ftr">
          <button className="btn-ghost px-4 py-2 text-sm rounded-lg" onClick={closeModal} disabled={saving}>Cancel</button>
          <button className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-1.5" disabled={saving} onClick={saveFile}>
            {saving ? <span><Spinner /> Saving </span> : "Save to Cloud"}
          </button>
        </div>
      </div>
    </div>
  );
}