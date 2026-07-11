import { useAppContext } from "../context/AppContext.jsx";
import { getMuminAge } from "../lib/utils.js";
import { printMumin, printIdCard } from "../lib/print.js";

export function MuminPreview() {
  var ctx = useAppContext();
  var muminPreview = ctx.muminPreview, setMuminPreview = ctx.setMuminPreview;
  var canEdit = ctx.canEdit, openModal = ctx.openModal;
  var getSabilMembers = ctx.getSabilMembers, getSectorInfo = ctx.getSectorInfo;

  if (!muminPreview) return null;

  var m = muminPreview;
  var sabilFamily = m.sabil_no ? getSabilMembers(m.sabil_no).filter(function (o) { return o.id !== m.id; }) : [];

  return (
    <div className="preview-overlay" onClick={function () { setMuminPreview(null); }}>
      <div className="preview-box" onClick={function (e) { e.stopPropagation(); }}>
        <div className="preview-hdr">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="preview-avatar">
              {m.photo_url
                ? <img src={m.photo_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                : (m.name ? m.name[0].toUpperCase() : "?")}
            </div>
            <div>
              <div className="preview-name">{m.name}</div>
              <div className="preview-its">ITS: {m.its_number}</div>
              <span className={"badge badge-" + (m.status || "").toLowerCase()} style={{ marginTop: 6, display: "inline-block" }}>{m.status}</span>
            </div>
          </div>
          <button className="modal-close" onClick={function () { setMuminPreview(null); }}>x</button>
        </div>
        <div className="preview-body">
          <div className="preview-section">
            <div className="preview-sec-title">Personal Details</div>
            <div className="preview-grid">
              <div className="preview-field"><div className="preview-field-label">Age</div><div className="preview-field-val">{getMuminAge(m) || "—"}{m.dob ? " (DOB: " + m.dob + ")" : ""}</div></div>
              <div className="preview-field"><div className="preview-field-label">Gender</div><div className="preview-field-val">{m.gender || "—"}</div></div>
              <div className="preview-field">
                <div className="preview-field-label">Phone</div>
                <div className="preview-field-val" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span>{m.phone || "—"}</span>
                  {m.phone && (
                    <span style={{ display: "flex", gap: 6 }}>
                      <a href={"tel:" + m.phone.replace(/[^0-9+]/g, "")} className="quick-contact-btn quick-call" title="Call">📞</a>
                      <a href={"https://wa.me/" + m.phone.replace(/[^0-9]/g, "")} target="_blank" rel="noopener noreferrer" className="quick-contact-btn quick-wa" title="WhatsApp">💬</a>
                    </span>
                  )}
                </div>
              </div>
              <div className="preview-field"><div className="preview-field-label">Email</div><div className="preview-field-val" style={{ fontSize: 12 }}>{m.email || "—"}</div></div>
              <div className="preview-field" style={{ gridColumn: "span 2" }}><div className="preview-field-label">Address</div><div className="preview-field-val">{m.address || "—"}</div></div>
              <div className="preview-field" style={{ gridColumn: "span 2" }}><div className="preview-field-label">Area Sector</div><div className="preview-field-val">{m.area_sector || "—"}</div></div>
              <div className="preview-field" style={{ gridColumn: "span 2" }}><div className="preview-field-label">Sabil No.</div><div className="preview-field-val">{m.sabil_no || "—"}</div></div>
            </div>
          </div>
          {m.sabil_no && sabilFamily.length > 0 && (
            <div className="preview-section">
              <div className="preview-sec-title">Family — Sabil No. {m.sabil_no}</div>
              {sabilFamily.map(function (o) {
                return (
                  <div className="preview-family-chip" key={o.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, cursor: "pointer" }} onClick={function () { setMuminPreview(o); }}>
                    <span>🏠 {o.name}</span>
                    <span style={{ color: "#6b7280", fontSize: 11 }}>{o.its_number}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            {canEdit && <button className="btn btn-primary" style={{ flex: 1 }} onClick={function () { setMuminPreview(null); openModal("mumin", "edit", m); }}>Edit Record</button>}
            <button className="btn btn-ghost" onClick={function () { printIdCard(m, sabilFamily, getSectorInfo(m)); }}>🪪 ID Card</button>
            <button className="btn btn-ghost" onClick={function () { printMumin(m, sabilFamily, getSectorInfo(m)); }}>🖨 Print</button>
            <button className="btn btn-ghost" onClick={function () { setMuminPreview(null); }}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
