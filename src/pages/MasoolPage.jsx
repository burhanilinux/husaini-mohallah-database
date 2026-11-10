import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";

function masoolPrintEscape(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
  });
}

function printMasoolSector(sector, subSectors, getMuminByIts, muminData) {
  var popup = window.open("", "_blank", "width=1000,height=750");
  if (!popup) {
    window.alert("Please allow pop-ups to print Sector Details.");
    return;
  }
  function memberByIts(its) {
    return its ? getMuminByIts(its) : null;
  }
  function memberValue(member, field, fallback) {
    return member && member[field] !== null && member[field] !== undefined && String(member[field]).trim() !== ""
      ? member[field] : (fallback || "—");
  }
  function memberDetails(member, fallbackName, fallbackIts, fallbackPhone) {
    var data = member || {};
    return [
      ["Name", memberValue(data, "name", fallbackName)],
      ["ITS", memberValue(data, "its_number", memberValue(data, "its_id", fallbackIts))],
      ["Age", memberValue(data, "age", "—")],
      ["Date of Birth", memberValue(data, "dob", "—")],
      ["Gender", memberValue(data, "gender", "—")],
      ["Phone", memberValue(data, "phone", fallbackPhone)],
      ["Email", memberValue(data, "email", "—")],
      ["Sabil No.", memberValue(data, "sabil_no", "—")],
      ["Address", memberValue(data, "address", "—")]
    ].map(function (item) {
      return "<div class='member-field'><b>" + masoolPrintEscape(item[0]) + ":</b> " + masoolPrintEscape(item[1]) + "</div>";
    }).join("");
  }
  var sectorMembers = (muminData || []).filter(function (member) {
    return String(member.area_sector || "").trim().toLowerCase() === String(sector.name || "").trim().toLowerCase();
  });
  function memberRow(member) {
    return "<tr><td>" + masoolPrintEscape(member.name || "—") + "</td><td>" +
      masoolPrintEscape(member.its_number || member.its_id || "—") + "</td><td>" +
      masoolPrintEscape(member.age || "—") + "</td><td>" + masoolPrintEscape(member.phone || "—") +
      "</td><td>" + masoolPrintEscape(member.sabil_no || "—") + "</td><td>" +
      masoolPrintEscape(member.address || "—") + "</td></tr>";
  }
  function memberTable(members) {
    return members.length ? "<table class='members-table'><thead><tr><th>Name</th><th>ITS</th><th>Age</th><th>Phone</th><th>Sabil No.</th><th>Address</th></tr></thead><tbody>" +
      members.map(memberRow).join("") + "</tbody></table>" :
      "<p class='empty'>No members assigned to this sub-sector.</p>";
  }
  var assignedSubIds = subSectors.map(function (sub) { return String(sub.id); });
  var unassignedMembers = sectorMembers.filter(function (member) {
    return !member.sub_sector_id || assignedSubIds.indexOf(String(member.sub_sector_id)) < 0;
  });
  var masoolMember = memberByIts(sector.masool_its);
  var masoolFallback = sector.masool_name || "Not assigned";
  var masoolHtml = memberDetails(masoolMember, masoolFallback, sector.masool_its, sector.masool_phone);
  var subSectorSections = subSectors.map(function (sub) {
    var musaidMember = memberByIts(sub.musaid_its);
    var musaidFallback = sub.musaid_name || "Not assigned";
    var members = sectorMembers.filter(function (member) {
      return String(member.sub_sector_id || "") === String(sub.id);
    });
    return "<section class='subsector-section'><h2>" + masoolPrintEscape(sub.name) +
      " <span class='count'>(" + members.length + " members)</span></h2><div class='musaid-details'><h3>Musaid Details</h3><div class='member-fields'>" +
      memberDetails(musaidMember, musaidFallback, sub.musaid_its, sub.musaid_phone) +
      "</div></div>" + memberTable(members) + "</section>";
  }).join("");
  popup.onload = function () { popup.print(); };
  popup.document.open();
  popup.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>Husaini Mohallah - Database | ${masoolPrintEscape(sector.name)}</title>
<style>
@page { size: A4 portrait; margin: 14mm; }
* { box-sizing: border-box; }
body { font-family: Arial, sans-serif; color: #171717; margin: 0; }
header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 18px; }
h1 { font-size: 20px; margin: 0 0 5px; }
header p { font-size: 11px; margin: 0; color: #555; }
h2 { font-size: 16px; margin: 18px 0 10px; }
h3 { font-size: 12px; margin: 0 0 7px; }
.subsector-section { margin: 18px 0 24px; break-inside: auto; }
.musaid-details { border: 1px solid #aaa; padding: 10px 12px; margin-bottom: 10px; }
.count { font-size: 12px; font-weight: normal; color: #555; }
.members-table { margin-top: 8px; font-size: 9px; }
.members-table th, .members-table td { padding: 5px; }
.members-table tr:nth-child(even) { background: #f7f7f7; }
.member-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px 16px; font-size: 11px; }
.member-field { padding: 2px 0; overflow-wrap: anywhere; }
.member-field b { color: #444; }
table { width: 100%; border-collapse: collapse; font-size: 11px; }
th, td { border: 1px solid #999; padding: 8px; text-align: left; vertical-align: top; }
th { background: #eee; }
.empty { font-size: 12px; color: #555; padding: 12px 0; }
@media print { tr { break-inside: avoid; } .details { break-inside: avoid; } }
</style></head><body>
<header><h1>Husaini Mohallah - Database</h1><p>Masool Module · Sector Details</p></header>
<h2>Sector: ${masoolPrintEscape(sector.name)}</h2>
<p class="sector-summary"><b>${sectorMembers.length}</b> members · <b>${subSectors.length}</b> sub-sectors</p>
<h2>Sub-Sector Members &amp; Musaid Details</h2>
${subSectors.length ? subSectorSections : '<p class="empty">No sub-sectors assigned to this sector.</p>'}
${unassignedMembers.length ? "<section class='subsector-section'><h2>Members Not Assigned to a Sub-Sector (" + unassignedMembers.length + ")</h2>" + memberTable(unassignedMembers) + "</section>" : ""}
</body></html>`);
  popup.document.close();
  popup.focus();
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
  var muminData = ctx.muminData || [];

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
                  <button className="btn btn-ghost btn-sm no-print" onClick={function (e) { e.stopPropagation(); printMasoolSector(sec, subs, getMuminByIts, muminData); }}>🖨 Print</button>
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
