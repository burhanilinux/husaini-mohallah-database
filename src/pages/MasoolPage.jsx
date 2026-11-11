import { printSectorDetails } from "../lib/print.js";
import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";

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
