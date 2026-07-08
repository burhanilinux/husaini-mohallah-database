import { useAppContext } from "../context/AppContext.jsx";
import { printFile } from "../lib/print.js";

export function FilePreview() {
  var ctx = useAppContext();
  var filePreview = ctx.filePreview, setFilePreview = ctx.setFilePreview;
  var canEdit = ctx.canEdit, openModal = ctx.openModal;
  var getFileAtts = ctx.getFileAtts, setLightbox = ctx.setLightbox;

  if (!filePreview) return null;

  var f = filePreview;
  var atts = getFileAtts(f.id);

  return (
    <div className="preview-overlay" onClick={function () { setFilePreview(null); }}>
      <div className="file-preview-box" onClick={function (e) { e.stopPropagation(); }}>
        <div className="file-preview-hdr">
          <div>
            <div style={{ fontSize: 11, color: "#c9a84c", marginBottom: 4, textTransform: "uppercase", letterSpacing: 2 }}>{f.umoor_type}</div>
            <div className="file-preview-title">{f.title}</div>
            <span className={"badge badge-" + (f.status || "").toLowerCase()} style={{ marginTop: 8, display: "inline-block" }}>{f.status}</span>
          </div>
          <button className="modal-close" onClick={function () { setFilePreview(null); }}>x</button>
        </div>
        <div className="file-preview-body">
          <div className="file-meta-grid">
            <div className="file-meta-item"><div className="file-meta-label">File No.</div><div className="file-meta-val" style={{ fontFamily: "monospace", color: "#c9a84c" }}>{f.file_no}</div></div>
            <div className="file-meta-item"><div className="file-meta-label">Year</div><div className="file-meta-val">{f.year}</div></div>
            <div className="file-meta-item"><div className="file-meta-label">Date</div><div className="file-meta-val">{f.date || "—"}</div></div>
          </div>
          {f.description && (
            <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(184,152,90,.08)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Description</div>
              <div style={{ fontSize: 13, color: "#d1c9bb", lineHeight: 1.6 }}>{f.description}</div>
            </div>
          )}
          <div className="preview-sec-title">Attachments ({atts.length})</div>
          {atts.length === 0 ? (
            <div className="att-viewer-empty">No attachments for this file.</div>
          ) : (
            <div className="att-viewer-grid">
              {atts.map(function (att) {
                var isImg = att.type && att.type.startsWith("image/");
                var isPdf = att.type === "application/pdf";
                return (
                  <div
                    className="att-viewer-item" key={att.id}
                    onClick={function () {
                      if (isImg) setLightbox({ url: att.url, name: att.name });
                      else if (att.url) window.open(att.url, "_blank");
                    }}
                  >
                    {isImg
                      ? <img className="att-viewer-thumb" src={att.url} alt={att.name} />
                      : <div className="att-viewer-pdf">{isPdf ? "📄" : "📎"}</div>}
                    <div className="att-viewer-name" title={att.name}>{att.name}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {canEdit && <button className="btn btn-primary" style={{ flex: 1 }} onClick={function () { setFilePreview(null); openModal("file", "edit", f); }}>Edit File</button>}
            <button className="btn btn-ghost" onClick={function () { printFile(f, atts); }}>🖨 Print</button>
            <button className="btn btn-ghost" onClick={function () { setFilePreview(null); }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
