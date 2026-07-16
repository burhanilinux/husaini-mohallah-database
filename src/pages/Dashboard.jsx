import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import { YEARS } from "../lib/constants.js";

export function Dashboard() {
  var ctx = useAppContext();
  var muminData = ctx.muminData, filesData = ctx.filesData, attsData = ctx.attsData;
  var loading = ctx.loading, selYear = ctx.selYear, setSelYear = ctx.setSelYear;
  var setSelUmoor = ctx.setSelUmoor, setSelSector = ctx.setSelSector, setPage = ctx.setPage;
  var umoorStats = ctx.umoorStats, areaSectors = ctx.areaSectors;

  return (
    <div>
      <div className="page-hdr">
        <div className="page-title">Dashboard</div>
        <div className="page-sub">Live data from Supabase</div>
      </div>
<<<<<<< HEAD

      {loading ? (
        <div className="flex items-center justify-center p-16 gap-3 text-sm text-brand-muted">
          <Spinner /> Loading
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Responsive Metrics Grid Matrix */}
          <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
=======
      {loading ? <div className="loading"><Spinner /> Loading…</div> : (
        <div>
          <div className="stats-grid">
>>>>>>> parent of 96dd4d4 (Transition to Tailwind CSS)
            {[
              { label: "Total Mumineen", value: muminData.length, desc: "Registered members" },
              { label: "Total Files", value: filesData.length, desc: "All years combined" },
              { label: "Active Files", value: filesData.filter(function (f) { return f.status === "Active"; }).length, desc: "Currently open" },
              { label: "Attachments", value: attsData.length, desc: "Scans and photos" },
            ].map(function (s) {
              return (
<<<<<<< HEAD
                <div 
                  key={s.label} 
                  className="relative overflow-hidden rounded-xl border border-brand-gold/12 bg-white/[0.02] p-5 pt-6 before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-brand-gold before:to-transparent"
                >
                  <div className="text-[11px] uppercase tracking-[2px] text-brand-muted font-medium block mb-1">{s.label}</div>
                  <div className="text-3xl font-semibold text-brand-text mt-1">{s.value}</div>
                  <div className="mt-1.5 text-xs text-gray-600">{s.desc}</div>
=======
                <div className="stat-card" key={s.label}>
                  <div className="stat-lbl">{s.label}</div>
                  <div className="stat-val">{s.value}</div>
                  <div className="stat-desc">{s.desc}</div>
>>>>>>> parent of 96dd4d4 (Transition to Tailwind CSS)
                </div>
              );
            })}
          </div>

          <div className="year-dropdown-wrap">
            <select className="year-dropdown" value={selYear} onChange={function (e) { setSelYear(Number(e.target.value)); }}>
              {YEARS.map(function (y) { return <option key={y} value={y}>{y}</option>; })}
            </select>
          </div>

          <div className="card">
            <div className="card-hdr">
              <span className="card-title">12 Umoor — {selYear}</span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{filesData.filter(function (f) { return f.year === selYear; }).length} files</span>
            </div>
            <div style={{ padding: 20 }}>
              <div className="umoor-grid">
                {umoorStats.map(function (u) {
                  return (
                    <div key={u.name} className="umoor-card" onClick={function () { setSelUmoor(u.name); setPage("files"); }}>
                      <div className="umoor-num">File {String(u.num).padStart(2, "0")}</div>
                      <div className="umoor-name">{u.name}</div>
                      <div className="umoor-count">{u.count} file{u.count !== 1 ? "s" : ""}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {areaSectors.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-hdr">
                <span className="card-title">Members by Area Sector</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{muminData.length} total</span>
              </div>
              <div style={{ padding: 20 }}>
                <div className="umoor-grid">
                  {areaSectors.map(function (s) {
                    var count = muminData.filter(function (m) { return m.area_sector === s; }).length;
                    return (
                      <div key={s} className="umoor-card" onClick={function () { setSelSector(s); setPage("mumin"); }}>
                        <div className="umoor-name">{s}</div>
                        <div className="umoor-count">{count} member{count !== 1 ? "s" : ""}</div>
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
