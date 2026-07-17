import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import { YEARS } from "../lib/constants.js";

export function Dashboard() {
  var ctx = useAppContext();
  var muminData = ctx.muminData, filesData = ctx.filesData, attsData = ctx.attsData;
  var loading = ctx.loading, selYear = ctx.selYear, setSelYear = ctx.setSelYear;
  var setSelUmoor = ctx.setSelUmoor, setSelSector = ctx.setSelSector, setPage = ctx.setPage;
  var { umoorStats, areaSectors } = ctx;

  return (
    <div className="w-full flex-1 p-6 md:p-9 lg:ml-[260px]">
      {/* Header Block */}
      <div className="mb-8">
        <div className="font-sans text-2xl font-bold text-brand-gold sm:text-[28px]">Dashboard</div>
        <div className="mt-1 text-xs text-brand-muted sm:text-[13px]">Live data from Supabase Cloud Workspace</div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16 gap-3 text-sm text-brand-muted">
          <Spinner /> Loading
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Responsive Metrics Grid Matrix */}
          <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Mumineen", value: muminData.length, desc: "Registered members" },
              { label: "Total Files", value: filesData.length, desc: "All years combined" },
              { label: "Active Files", value: filesData.filter(function (f) { return f.status === "Active"; }).length, desc: "Currently open" },
              { label: "Attachments", value: attsData.length, desc: "Scans and photos" },
            ].map(function (s) {
              return (
                <div 
                  key={s.label} 
                  className="relative overflow-hidden rounded-xl border border-brand-gold/12 bg-white/[0.02] p-5 pt-6 before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-brand-gold before:to-transparent"
                >
                  <div className="text-[11px] uppercase tracking-[2px] text-brand-muted font-medium block mb-1.5">{s.label}</div>
                  <div className="text-3xl font-semibold text-brand-text mt-1">{s.value}</div>
                  <div className="mt-1 text-xs text-gray-600">{s.desc}</div>
                </div>
              );
            })}
          </div>

          {/* Selector Context Filter Dropdown */}
          <div className="mb-2">
            <select 
              className="appearance-none bg-white/[0.03] border border-brand-gold/25 text-brand-gold font-semibold text-sm px-4 py-2 pr-9 rounded-xl cursor-pointer transition-colors focus:border-brand-gold/50 outline-none"
              value={selYear} 
              onChange={function (e) { setSelYear(Number(e.target.value)); }}
            >
              {YEARS.map(function (y) { return <option key={y} value={y} className="bg-brand-panel text-brand-text">{y}</option>; })}
            </select>
          </div>

          {/* 12 Umoor Cluster Framework Layout */}
          <div className="bg-white/[0.02] border border-brand-gold/10 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gold/10">
              <span className="text-sm font-semibold text-brand-text">12 Umoor Department Metrics &mdash; {selYear}</span>
              <span className="text-xs text-brand-muted">{filesData.filter(function (f) { return f.year === selYear; }).length} files listed</span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {umoorStats.map(function (u) {
                  return (
                    <div className="bg-white/[0.02] border border-brand-gold/10 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-brand-gold/30 hover:bg-brand-gold/[0.05]" key={u.name} onClick={function () { setSelUmoor(u.name); setPage("files"); }}>
                      <div className="text-[11px] text-brand-gold font-semibold mb-1">File {String(u.num).padStart(2, "0")}</div>
                      <div className="text-xs font-medium text-brand-text">{u.name}</div>
                      <div className="text-[11px] text-brand-muted mt-1">{u.count} file{u.count !== 1 ? "s" : ""}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Region Sectors Summary Card Grid */}
          {areaSectors.length > 0 && (
            <div className="bg-white/[0.02] border border-brand-gold/10 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gold/10">
                <span className="text-sm font-semibold text-brand-text">Members Distribution by Area Sector</span>
                <span className="text-xs text-brand-muted">{muminData.length} total across town</span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {areaSectors.map(function (s) {
                    var count = muminData.filter(function (m) { return m.area_sector === s; }).length;
                    return (
                      <div className="bg-white/[0.02] border border-brand-gold/10 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-brand-gold/30 hover:bg-brand-gold/[0.05]" key={s} onClick={function () { setSelSector(s); setPage("mumin"); }}>
                        <div className="text-xs font-medium text-brand-text mb-1">{s}</div>
                        <div className="text-[11px] text-brand-muted">{count} member{count !== 1 ? "s" : ""}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}