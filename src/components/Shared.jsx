import { useRef, useState } from "react";
import { fileToBase64, fmtBytes } from "../lib/utils.js";
import { usePhotoUrl } from "../lib/usePhotoUrl.js";

// ── Loading spinner ───────────────────────────────────────────────
export function Spinner() {
  return <span className="spinner" />;
}

// ── Avatar: signed photo with graceful fallback to the first initial ──
export function Avatar({ url, name }) {
  const src = usePhotoUrl(url);
  const [failedSrc, setFailedSrc] = useState(null);
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  if (src && failedSrc !== src) {
    return <img src={src} alt="" onError={function () { setFailedSrc(src); }} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />;
  }
  return <span>{initial}</span>;
}

// ── Small rectangular photo preview (edit form) ───────────────────
export function PhotoThumb({ url, style }) {
  const src = usePhotoUrl(url);
  if (!src) return <div style={Object.assign({ background: "rgba(201,168,76,.1)" }, style)} />;
  return <img src={src} alt="" style={style} />;
}

// ── Attachment thumbnail (image / pdf / generic file icon) ────────
export function AttThumb({ url, type }) {
  if (url && type && type.indexOf("image/") === 0) {
    return <div className="att-thumb"><img src={url} alt="" /></div>;
  }
  if (type === "application/pdf") {
    return <div className="att-thumb"><span className="pdf-badge">PDF</span></div>;
  }
  return <div className="att-thumb">📄</div>;
}

// ── Drag/click upload zone — converts files to base64 for preview ──
export function UploadZone({ onFiles, uploading }) {
  const ref = useRef();

  function handle(fileList) {
    var arr = Array.from(fileList);
    Promise.all(arr.map(function (f) {
      return fileToBase64(f).then(function (dataUrl) {
        return { name: f.name, size: f.size, type: f.type, dataUrl: dataUrl };
      });
    })).then(onFiles);
  }

  return (
    <div className="upload-zone" onClick={function () { if (!uploading) ref.current.click(); }}>
      <input
        ref={ref} type="file" accept="image/*,.pdf" multiple style={{ display: "none" }}
        onChange={function (e) { handle(e.target.files); }}
      />
      <div className="upload-zone-icon">{uploading ? <Spinner /> : "📎"}</div>
      <div className="upload-zone-text">{uploading ? "Uploading…" : "Click or drag files to attach"}</div>
      <div className="upload-zone-sub">JPG, PNG, TIFF, PDF</div>
    </div>
  );
}

// ── List of attached files with optional remove/view actions ──────
export function AttList({ atts, onRemove, onView }) {
  if (!atts || !atts.length) return null;
  return (
    <div className="att-list">
      {atts.map(function (a, i) {
        return (
          <div className="att-item" key={i}>
            <AttThumb url={a.url || a.dataUrl} type={a.type} />
            <div className="att-info">
              <div className="att-name">{a.name}</div>
              <div className="att-meta">{fmtBytes(a.size || 0)}{a.url ? " · ☁ saved" : ""}</div>
            </div>
            {(a.url || a.dataUrl) && a.type && a.type.indexOf("image/") === 0 && (
              <button className="att-view" onClick={function () { onView(a); }}>View</button>
            )}
            {onRemove && <button className="att-rm" onClick={function () { onRemove(i); }}>×</button>}
          </div>
        );
      })}
    </div>
  );
}
