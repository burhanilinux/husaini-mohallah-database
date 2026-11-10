import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";

function masoolPrintEscape(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
  });
}

function printMasoolSector(sector, subSectors, getMuminByIts) {
  var popup = window.open("", "_blank", "width=900,height=700");
  if (!popup) {
    window.alert("Please allow pop-ups to print Sector Details.");
    return;
  }
  var masool = sector.masool_its
    ? ((getMuminByIts(sector.masool_its) || {}).name || sector.masool_its)
    : (sector.masool_name || "Not assigned");
  var rows = subSectors.map(function (sub) {
    var musaid = sub.musaid_its
      ? ((getMuminByIts(sub.musaid_its) || {}).name || sub.musaid_its)
      : (sub.musaid_name || "Not assigned");
    return "<tr><td>" + masoolPrintEscape(sub.name) + "</td><td>" + masoolPrintEscape(musaid) + "</td></tr>";
  }).join("");
  popup.document.open();
  popup.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Husaini Mohallah - Database | ${masoolPrintEscape(sector.name)}</title>
<style>
@page { size: A4 portrait; margin: 18mm; }
* { box-sizing: border-box; }
body { font-family: Arial, sans-serif; color: #171717; margin: 0; }
header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 14px; margin-bottom: 22px; }
h1 { font-size: 20px; margin: 0 0 5px; }
header p { font-size: 12px; margin: 0; color: #555; }
h2 { font-size: 18px; margin: 0 0 16px; }
.details { border: 1px solid #aaa; padding: 14px 16px; margin-bottom: 22px; }
.detail { display: flex; gap: 12px; padding: 7px 0; font-size: 13px; }
.detail strong { width: 115px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { border: 1px solid #999; padding: 9px 10px; text-align: left; }
th { background: #eee; }
.empty { font-size: 12px; color: #555; padding: 12px 0; }
</style></head><body>
<header><h1>Husaini Mohallah - Database</h1><p>Masool Module · Sector Details</p></header>
<h2>Sector: ${masoolPrintEscape(sector.name)}</h2>
<section class="details">
<div class="detail"><strong>Sector Name</strong><span>${masoolPrintEscape(sector.name)}</span></div>
<div class="detail"><strong>Masool</strong><span>${masoolPrintEscape(masool)}</span></div>
</section>
<h2>Sub-Sectors &amp; Musaid Details</h2>
${subSectors.length ? "<table><thead><tr><th>Sub-Sector</th><th>Musaid Name</th></tr></thead><tbody>" + rows + "</tbody></table>" : '<p class="empty">No sub-sectors assigned to this sector.</p>'}
</body></html>`);
  popup.document.close();
  popup.focus();
  popup.onload = function () { popup.print(); };
}

export function MasoolPage() {
  var ctx = useAppContext();
  var canEdit = ctx.canEdit, canDelete = ctx.canDelete;
  var loading = ctx.loading, sectorsData = ctx.sectorsData;
  var expandedSector = ctx.expandedSector, setExpandedSector = ctx.setExpandedSector;
  var openSectorModal = ctx.openSectorModal, deleteSector = ctx.deleteSector;
  var openSubSectorModal = ctx.openSubSectorModal, deleteSubSector = ctx.deleteSubSector;
  var getSubSectorsFor = ctx.getSubSectorsFor, getMuminCountForSector = ctx.getMuminCountForSector;
  var getMuminCountForSubSector = ctx.getMuminCountForSubSector, getMuminByIts = ctx.getMuminByIts;

  return (
    <div>
      <div className="page-hdr" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div className="page-title">Masool</div>
          <div className="page-sub">Sectors, their Masool, sub-sectors and Musaid</div>
        </div>
        {canEdit && <button className="btn btn-primary" onClick={function () { openSectorModal("add"); }}>+ New Sector</button>}
      </div>

      {loading ? <div className="loading"><Spinner /> Loading…</div> : sectorsData.length === 0 ? (
        <div className="card">
          <div className="empty" style={{ padding: 60 }}>
            <div className="empty-icon">🧭</div>
            <div>No sectors yet. Create a sector and assign its Masool.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sectorsData.map(function (sec) {
            var subs = getSubSectorsFor(sec.id);
            var memberCount = getMuminCountForSector(sec.name);
            var masoolLabel = sec.masool_its ? (getMuminByIts(sec.masool_its) ? getMuminByIts(sec.masool_its).name : sec.masool_its) : (sec.masool_name || "Not assigned");
            var expanded = expandedSector === sec.id;
            return (
              <div className="card" key={sec.id}>
                <div className="masool-sector-hdr" onClick={function () { setExpandedSector(expanded ? null : sec.id); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, cursor: "pointer" }}>
                    <span className="masool-expand-icon">{expanded ? "▾" : "▸"}</span>
                    <div>
                      <div className="masool-sector-name">{sec.name}</div>
                      <div className="masool-sector-meta">{memberCount} member{memberCount !== 1 ? "s" : ""} · {subs.length} sub-sector{subs.length !== 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm no-print" onClick={function (e) { e.stopPropagation(); printMasoolSector(sec, subs, getMuminByIts); }}>🖨 Print</button>
                  <div className="masool-badge">
                    <span className="masool-badge-label">Masool</span>
                    <span className="masool-badge-name">{masoolLabel}</span>
                    {sec.masool_phone && (
                      <span style={{ display: "flex", gap: 4, marginLeft: 6 }}>
                        <a href={"tel:" + sec.masool_phone.replace(/[^0-9+]/g, "")} className="quick-contact-btn quick-call" title="Call" onClick={function (e) { e.stopPropagation(); }}>📞</a>
                        <a href={"https://wa.me/" + sec.masool_phone.replace(/[^0-9]/g, "")} target="_blank" rel="noopener noreferrer" className="quick-contact-btn quick-wa" title="WhatsApp" onClick={function (e) { e.stopPropagation(); }}>💬</a>
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <div style={{ display: "flex", gap: 6 }} onClick={function (e) { e.stopPropagation(); }}>
                      <button className="btn btn-ghost btn-sm" onClick={function () { openSectorModal("edit", sec); }}>Edit</button>
                      {canDelete && <button className="btn btn-danger" onClick={function () { deleteSector(sec); }}>🗑</button>}
                    </div>
                  )}
                </div>

                {expanded && (
                  <div className="masool-subsectors">
                    {subs.length === 0 ? (
                      <div style={{ padding: "14px 20px", fontSize: 12, color: "#6b7280" }}>No sub-sectors yet under this Masool.</div>
                    ) : subs.map(function (sub) {
                      var subMemberCount = getMuminCountForSubSector(sub.id);
                      var musaidLabel = sub.musaid_its ? (getMuminByIts(sub.musaid_its) ? getMuminByIts(sub.musaid_its).name : sub.musaid_its) : (sub.musaid_name || "Not assigned");
                      return (
                        <div className="masool-subsector-row" key={sub.id}>
                          <div>
                            <div className="masool-subsector-name">{sub.name}</div>
                            <div className="masool-sector-meta">{subMemberCount} member{subMemberCount !== 1 ? "s" : ""}</div>
                          </div>
                          <div className="masool-badge">
                            <span className="masool-badge-label">Musaid</span>
                            <span className="masool-badge-name">{musaidLabel}</span>
                            {sub.musaid_phone && (
                              <span style={{ display: "flex", gap: 4, marginLeft: 6 }}>
                                <a href={"tel:" + sub.musaid_phone.replace(/[^0-9+]/g, "")} className="quick-contact-btn quick-call" title="Call">📞</a>
                                <a href={"https://wa.me/" + sub.musaid_phone.replace(/[^0-9]/g, "")} target="_blank" rel="noopener noreferrer" className="quick-contact-btn quick-wa" title="WhatsApp">💬</a>
                              </span>
                            )}
                          </div>
                          {canEdit && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button className="btn btn-ghost btn-sm" onClick={function () { openSubSectorModal("edit", sec.id, sub); }}>Edit</button>
                              {canDelete && <button className="btn btn-danger" onClick={function () { deleteSubSector(sub); }}>🗑</button>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {canEdit && (
                      <div style={{ padding: "12px 20px" }}>
                        <button className="btn btn-ghost btn-sm" onClick={function () { openSubSectorModal("add", sec.id); }}>+ Add Sub-Sector</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
