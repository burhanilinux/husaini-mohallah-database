import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import { DashboardSearch } from "../components/DashboardSearch.jsx";
import { getMuminAge } from "../lib/utils.js";

export function Dashboard() {
  var ctx = useAppContext();
  var muminData = ctx.muminData, filesData = ctx.filesData, attsData = ctx.attsData;
  var loading = ctx.loading;
  var setSelSector = ctx.setSelSector, setPage = ctx.setPage;
  var areaSectors = ctx.areaSectors;

  var active = muminData.filter(function (m) { return !m.status || m.status === "Active"; }).length;
  var families = muminData.filter(function (m) { return m.sabil_no && String(m.sabil_no).trim(); }).reduce(function (acc, m) { acc[String(m.sabil_no).trim()] = true; return acc; }, {});
  var missingPhone = muminData.filter(function (m) { return !(m.phone || "").trim(); }).length;
  var ageGroups = [
    { label: "Children", range: "0–15", min: 0, max: 15 },
    { label: "Youth", range: "16–30", min: 16, max: 30 },
    { label: "Adults", range: "31–60", min: 31, max: 60 },
    { label: "Seniors", range: "61+", min: 61, max: 999 },
  ].map(function (g) {
    var count = muminData.filter(function (m) { var a = getMuminAge(m); return a !== null && a >= g.min && a <= g.max; }).length;
    return Object.assign({}, g, { count: count });
  });

  return (
    <div>
      <div className="page-hdr">
        <div className="page-title">Dashboard</div>
        <div className="page-sub">Live data from Supabase</div>
      </div>
      <DashboardSearch />
      {loading ? <div className="loading"><Spinner /> Loading…</div> : (
        <div>
          <div className="stats-grid">
            {[
              { label: "Total Mumineen", value: muminData.length, desc: "Registered members" },
              { label: "Active Members", value: active, desc: "Current active records" },
              { label: "Families / Sabil", value: Object.keys(families).length, desc: "Unique family groups" },
              { label: "Missing Phone", value: missingPhone, desc: "Needs data attention" },
              { label: "Total Files", value: filesData.length, desc: "All years combined" },
              { label: "Attachments", value: attsData.length, desc: "Scans and photos" },
            ].map(function (s) {
              return <div className="stat-card" key={s.label}><div className="stat-lbl">{s.label}</div><div className="stat-val">{s.value}</div><div className="stat-desc">{s.desc}</div></div>;
            })}
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-hdr"><span className="card-title">Age Demographics</span><span style={{ fontSize: 12, color: "#6b7280" }}>{muminData.length} total members</span></div>
            <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              {ageGroups.map(function (g) {
                var pct = muminData.length ? ((g.count / muminData.length) * 100).toFixed(1) : "0.0";
                return <div key={g.label} className="umoor-card"><div className="umoor-name">{g.label}</div><div className="umoor-count">{g.range}</div><div style={{ fontSize: 24, fontWeight: 700, color: "#e2d9c9", marginTop: 8 }}>{g.count}</div><div style={{ fontSize: 11, color: "#6b7280" }}>{pct}% of members</div></div>;
              })}
            </div>
          </div>

          {areaSectors.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-hdr"><span className="card-title">Members by Area Sector</span><span style={{ fontSize: 12, color: "#6b7280" }}>{muminData.length} total</span></div>
              <div style={{ padding: 20 }}><div className="umoor-grid">
                {areaSectors.map(function (s) {
                  var count = muminData.filter(function (m) { return m.area_sector === s; }).length;
                  return <div key={s} className="umoor-card" onClick={function () { setSelSector(s); setPage("mumin"); }}><div className="umoor-name">{s}</div><div className="umoor-count">{count} member{count !== 1 ? "s" : ""}</div></div>;
                })}
              </div></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
