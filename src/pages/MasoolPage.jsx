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
    <div className="w-full flex-1 p-6 md:p-9 lg:ml-[260px]">
      {/* Header Container */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap sm:flex-nowrap">
        <div>
          <div className="font-sans text-2xl font-bold text-brand-gold sm:text-[28px]">Masool Layout</div>
          <div className="mt-1 text-xs text-brand-muted sm:text-[13px]">Sectors, assigned Masool heads, sub-sectors and Musaid teams</div>
        </div>
        {canEdit && (
          <button className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm cursor-pointer whitespace-nowrap" onClick={function () { openSectorModal("add"); }}>
            + New Sector
          </button>
        )}
      </div>

      {/* Main Content Render */}
      {loading ? (
        <div className="flex items-center justify-center p-16 gap-3 text-sm text-brand-muted">
          <Spinner /> Loading
        </div>
      ) : sectorsData.length === 0 ? (
        <div className="bg-white/[0.02] border border-brand-gold/10 rounded-xl overflow-hidden">
          <div className="text-center py-16 px-6 text-brand-muted">
            <div className="text-4xl opacity-40 mb-3"> </div>
            <div className="text-sm">No sectors created yet. Initialize a sector zone and assign its Masool coordinator to begin.</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sectorsData.map(function (sec) {
            var subs = getSubSectorsFor(sec.id);
            var memberCount = getMuminCountForSector(sec.name);
            var masoolLabel = sec.masool_its ? (getMuminByIts(sec.masool_its) ? getMuminByIts(sec.masool_its).name : sec.masool_its) : (sec.masool_name || "Not assigned");
            var expanded = expandedSector === sec.id;
            
            return (
              <div className="bg-white/[0.02] border border-brand-gold/10 rounded-xl overflow-hidden" key={sec.id}>
                {/* Sector Row Header */}
                <div 
                  className="flex items-center justify-between p-4 md:p-5 flex-wrap gap-4 cursor-pointer hover:bg-brand-gold/[0.02] transition-colors"
                  onClick={function () { setExpandedSector(expanded ? null : sec.id); }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <span className="text-brand-gold text-xs w-4 shrink-0 transition-transform duration-200">
                      {expanded ? "▼" : "▶"}
                    </span>
                    <div>
                      <div className="text-base font-semibold text-brand-text">{sec.name}</div>
                      <div className="text-[11px] text-brand-muted mt-0.5">
                        {memberCount} member{memberCount !== 1 ? "s" : ""} &bull; {subs.length} sub-sector{subs.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  {/* Masool Identity Badge */}
                  <div className="flex items-center gap-3 bg-brand-gold/5 border border-brand-gold/18 rounded-xl p-2 px-3.5 max-w-full sm:max-w-auto">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-gold-dark bg-brand-gold/15 px-2 py-0.5 rounded-full shrink-0">Masool</span>
                    <span className="text-sm font-medium text-brand-text truncate max-w-[180px]">{masoolLabel}</span>
                    {sec.masool_phone && (
                      <div className="flex items-center gap-1.5 ml-1.5 shrink-0" onClick={function (e) { e.stopPropagation(); }}>
                        <a href={"tel:" + sec.masool_phone.replace(/[^0-9+]/g, "")} className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-brand-info/10 border border-brand-info/25 text-brand-info transition-colors hover:bg-brand-info/20" title="Call">📞</a>
                        <a href={"https://wa.me/" + sec.masool_phone.replace(/[^0-9]/g, "")} target="_blank" rel="noopener noreferrer" className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-brand-success/10 border border-brand-success/25 text-brand-success transition-colors hover:bg-brand-success/20" title="WhatsApp">💬</a>
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  {canEdit && (
                    <div className="flex items-center gap-2" onClick={function (e) { e.stopPropagation(); }}>
                      <button className="btn-ghost px-2.5 py-1 text-xs rounded-md" onClick={function () { openSectorModal("edit", sec); }}>Edit</button>
                      {canDelete && <button className="btn-danger rounded-md" onClick={function () { deleteSector(sec); }}>Delete</button>}
                    </div>
                  )}
                </div>

                {/* Expanded Sub-Sectors Accordion Drawer Container */}
                {expanded && (
                  <div className="border-t border-brand-gold/10 bg-black/15">
                    {subs.length === 0 ? (
                      <div className="p-5 pl-12 text-xs text-brand-muted italic">No sub-sectors registered under this coordinator scope yet.</div>
                    ) : subs.map(function (sub) {
                      var subMemberCount = getMuminCountForSubSector(sub.id);
                      var musaidLabel = sub.musaid_its ? (getMuminByIts(sub.musaid_its) ? getMuminByIts(sub.musaid_its).name : sub.musaid_its) : (sub.musaid_name || "Not assigned");
                      
                      return (
                        <div className="flex items-center justify-between p-3.5 pl-12 pr-5 border-b border-white/[0.03] last:border-b-0 flex-wrap gap-4" key={sub.id}>
                          <div>
                            <div className="text-sm font-semibold text-brand-text">{sub.name}</div>
                            <div className="text-[11px] text-brand-muted mt-0.5">{subMemberCount} member{subMemberCount !== 1 ? "s" : ""}</div>
                          </div>

                          {/* Musaid Team Tag */}
                          <div className="flex items-center gap-3 bg-brand-gold/5 border border-brand-gold/18 rounded-xl p-1.5 px-3">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-brand-gold-dark bg-brand-gold/15 px-2 py-0.5 rounded-full shrink-0">Musaid</span>
                            <span className="text-xs font-medium text-brand-text truncate max-w-[150px]">{musaidLabel}</span>
                            {sub.musaid_phone && (
                              <div className="flex items-center gap-1.5 ml-1 shrink-0">
                                <a href={"tel:" + sub.musaid_phone.replace(/[^0-9+]/g, "")} className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-brand-info/10 border border-brand-info/25 text-brand-info hover:bg-brand-info/20" title="Call">📞</a>
                                <a href={"https://wa.me/" + sub.musaid_phone.replace(/[^0-9]/g, "")} target="_blank" rel="noopener noreferrer" className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-brand-success/10 border border-brand-success/25 text-brand-success hover:bg-brand-success/20" title="WhatsApp">💬</a>
                              </div>
                            )}
                          </div>

                          {/* Sub-Sector Control Callouts */}
                          {canEdit && (
                            <div className="flex items-center gap-2">
                              <button className="btn-ghost px-2 py-0.5 text-xs rounded-md" onClick={function () { openSubSectorModal("edit", sec.id, sub); }}>Edit</button>
                              {canDelete && <button className="btn-danger py-0.5 text-xs rounded-md" onClick={function () { deleteSubSector(sub); }}>Delete</button>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Add Drawer Row */}
                    {canEdit && (
                      <div className="p-3 pl-12">
                        <button className="btn-ghost text-xs px-3 py-1 rounded-lg" onClick={function () { openSubSectorModal("add", sec.id); }}>+ Add Sub-Sector</button>
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