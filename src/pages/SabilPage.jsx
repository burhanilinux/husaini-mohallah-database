import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";

export function SabilPage() {
  var ctx = useAppContext();
  var loading = ctx.loading, sabilNos = ctx.sabilNos, getSabilMembers = ctx.getSabilMembers;
  var setSabilPreview = ctx.setSabilPreview;

  return (
    <div className="w-full flex-1 p-6 md:p-9 lg:ml-[260px]">
      {/* Header Container */}
      <div className="mb-8">
        <div className="font-sans text-2xl font-bold text-brand-gold sm:text-[28px]">Sabil Groups</div>
        <div className="mt-1 text-xs text-brand-muted sm:text-[13px]">Members grouped by shared Sabil Household Numbers</div>
      </div>

      {/* Main Content Card Workspace */}
      {loading ? (
        <div className="flex items-center justify-center p-16 gap-3 text-sm text-brand-muted">
          <Spinner /> Loading
        </div>
      ) : (
        <div>
          {sabilNos.length === 0 ? (
            <div className="bg-white/[0.02] border border-brand-gold/10 rounded-xl overflow-hidden">
              <div className="text-center py-16 px-6 text-brand-muted">
                <div className="text-4xl opacity-40 mb-3">🏠</div>
                <div className="text-sm">No Sabil Numbers assigned yet. Set a Sabil No. on a Mumin record to group family households here.</div>
              </div>
            </div>
          ) : (
            /* Responsive Grid Matrix for Family Cards */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sabilNos.map(function (sn) {
                var members = getSabilMembers(sn);
                return (
                  <div className="bg-white/[0.02] border border-brand-gold/10 rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-brand-gold/30" key={sn}>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-base font-semibold text-brand-gold">Sabil No. {sn}</div>
                          <div className="text-[11px] text-brand-muted mt-0.5">{members.length} household member{members.length !== 1 ? "s" : ""}</div>
                        </div>
                      </div>

                      {/* Stacked Household Members Row Group */}
                      <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-3">
                        {members.slice(0, 4).map(function (mem) {
                          return (
                            <div className="flex items-center justify-between py-1 border-b border-white/[0.02] last:border-0" key={mem.id}>
                              <span className="text-xs font-medium text-brand-text truncate max-w-[170px]">{mem.name}</span>
                              <span className="font-mono text-[10px] text-brand-muted shrink-0">{mem.its_number}</span>
                            </div>
                          );
                        })}
                        {members.length > 4 && (
                          <div className="text-[10px] text-brand-gold/70 font-medium pt-1 pl-1">
                            + {members.length - 4} more family members
                          </div>
                        )}
                      </div>
                    </div>

                    {/* View Drawer Button Block */}
                    <button
                      className="btn-ghost w-full mt-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                      onClick={function () { setSabilPreview(sn); }}
                    >
                      View All Members
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}