import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import { DashboardSearch } from "../components/DashboardSearch.jsx";

export function Dashboard() {
  var ctx = useAppContext();
  var muminData = ctx.muminData, filesData = ctx.filesData, attsData = ctx.attsData;
  var loading = ctx.loading;
  var setSelSector = ctx.setSelSector, setPage = ctx.setPage;
  var areaSectors = ctx.areaSectors;

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
              { label: "Total Files", value: filesData.length, desc: "All years combined" },
              { label: "Active Files", value: filesData.filter(function (f) { return f.status === "Active"; }).length, desc: "Currently open" },
              { label: "Attachments", value: attsData.length, desc: "Scans and photos" },
            ].map(function (s) {
              return (
                <div className="stat-card" key={s.label}>
                  <div className="stat-lbl">{s.label}</div>
                  <div className="stat-val">{s.value}</div>
                  <div className="stat-desc">{s.desc}</div>
                </div>
              );
            })}
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
