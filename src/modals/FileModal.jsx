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
        <div className="modal-hdr">
          <div className="modal-title">{modal.mode === "add" ? "Add" : "Edit"} Umoor File</div>
          <button className="modal-close" onClick={closeModal}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-grp">
              <label>Year</label>
              <select value={form.year || 2024} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { year: Number(e.target.value) }); }); }}>
                {YEARS.map(function (y) { return <option key={y}>{y}</option>; })}
              </select>
            </div>
            <div className="form-grp">
              <label>Status</label>
              <select value={form.status || "Active"} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { status: e.target.value }); }); }}>
                <option>Active</option><option>Closed</option><option>Pending</option>
              </select>
            </div>
            <div className="form-grp full">
              <label>Umoor Type</label>
              <select value={form.umoor_type || ""} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { umoor_type: e.target.value }); }); }}>
                <option value="">Select Umoor</option>
                {UMOOR_TYPES.map(function (u) { return <option key={u}>{u}</option>; })}
              </select>
            </div>
            <div className="form-grp full">
              <label>File Title</label>
              <input value={form.title || ""} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { title: e.target.value }); }); }} placeholder="Enter file title" />
            </div>
            <div className="form-grp">
              <label>Date</label>
              <input type="date" value={form.date || ""} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { date: e.target.value }); }); }} />
            </div>
            <div className="form-grp">
              <label>File No. (auto if blank)</label>
              <input value={form.file_no || ""} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { file_no: e.target.value }); }); }} placeholder={"HM-" + getUmoorPrefix(form.umoor_type || "") + "-" + (form.year || currentYear) + "-XXX"} />
            </div>
            <div className="form-grp full">
              <label>Description</label>
              <textarea value={form.description || ""} onChange={function (e) { setForm(function (f) { return Object.assign({}, f, { description: e.target.value }); }); }} placeholder="Notes or description" />
            </div>
          </div>
          <div className="sec-div" />
          <div className="sec-lbl">📎 Attachments — Scans and Photos</div>
          <UploadZone onFiles={function (files) { setFormAtts(function (a) { return a.concat(files); }); }} uploading={uploading} />
          <AttList
            atts={formAtts}
            onRemove={function (i) { setFormAtts(function (a) { return a.filter(function (_, idx) { return idx !== i; }); }); }}
            onView={function (a) { setLightbox({ url: a.url || a.dataUrl, name: a.name }); }}
          />
        </div>
        {formErrors.length > 0 && (
          <div className="form-err-box">
            {formErrors.map(function (err, i) { return <div key={i} className="form-err-line">⚠ {err}</div>; })}
          </div>
        )}
        <div className="modal-ftr">
          <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={saveFile}>
            {saving ? <span><Spinner /> Saving…</span> : "Save to Cloud ☁"}
          </button>
        </div>
      </div>
    </div>
  );
}
