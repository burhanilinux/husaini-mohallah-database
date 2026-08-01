import { useAppContext } from "../context/AppContext.jsx";
import { UMOOR_TYPES } from "../lib/constants.js";
import { getMuminAge } from "../lib/utils.js";

export function ReportsPage() {
  var ctx = useAppContext();
  var muminData = ctx.muminData, filesData = ctx.filesData, areaSectors = ctx.areaSectors;
  var sectorsData = ctx.sectorsData;
  var activityLog = ctx.activityLog;
  var printTarget = ctx.printTarget, setPrintTarget = ctx.setPrintTarget;
  var exportReportXLS = ctx.exportReportXLS, getSectorInfo = ctx.getSectorInfo, getMuminByIts = ctx.getMuminByIts;
  var getSubSectorsFor = ctx.getSubSectorsFor;

  return (
    <div>
      <div className="page-hdr no-print" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div><div className="page-title">Reports</div><div className="page-sub">Print and export formatted reports</div></div>
      </div>
      <div className="print-header" id="print-header">
        <h2>Husaini Mohallah — {printTarget && printTarget.label}</h2>
        <p>Generated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { id: "mumin", icon: "👤", label: "Mumin Directory", desc: "Full list of all registered members", data: muminData.length + " members" },
          { id: "files_all", icon: "🗂", label: "All Umoor Files", desc: "Complete file list across all departments", data: filesData.length + " files" },
          { id: "reminders", icon: "⏰", label: "Reminders Report", desc: "All files with due dates — overdue and upcoming", data: filesData.filter(function (f) { return f.due_date; }).length + " files with dates" },
          { id: "families", icon: "🏠", label: "Family Directory", desc: "Members grouped by Sabil No.", data: (function () { var s = {}; muminData.forEach(function (m) { if (m.sabil_no && String(m.sabil_no).trim()) s[String(m.sabil_no).trim()] = 1; }); return Object.keys(s).length + " sabil groups"; })() },
          { id: "age_groups", icon: "📊", label: "Age Group Summary", desc: "Members broken down by age group", data: muminData.length + " members" },
          { id: "sector_summary", icon: "📍", label: "Sector Summary", desc: "Member count breakdown by area sector", data: areaSectors.length + " sectors" },
          { id: "masool_directory", icon: "🧭", label: "Masool Directory", desc: "Sectors, Sub-Sectors, Masool & Musaid with contacts", data: sectorsData.length + " sectors" },
          { id: "activity_log", icon: "🕘", label: "Activity Log", desc: "Full history of actions across the system", data: activityLog.length + " entries" },
        ].map(function (r) {
          return (
            <div
              key={r.id} className="umoor-card" style={{ cursor: "pointer", position: "relative" }}
              onClick={function () { setPrintTarget(r); setTimeout(function () { window.print(); }, 300); }}
            >
              <button className="btn-xls-mini" title="Download as Excel" onClick={function (e) { e.stopPropagation(); exportReportXLS(r.id); }}>📊 XLS</button>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{r.icon}</div>
              <div className="umoor-name" style={{ fontSize: 14, marginBottom: 4 }}>{r.label}</div>
              <div className="umoor-count">{r.desc}</div>
              <div style={{ marginTop: 10, fontSize: 11, color: "#c9a84c" }}>{r.data} · Click to Print</div>
            </div>
          );
        })}
      </div>

      {/* Per-Umoor report cards */}
      <div className="card no-print">
        <div className="card-hdr" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(184,152,90,.1)" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#e2d9c9" }}>Print by Umoor Department</span>
        </div>
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {UMOOR_TYPES.map(function (u) {
            var count = filesData.filter(function (f) { return f.umoor_type === u; }).length;
            return (
              <div
                key={u} className="umoor-card" style={{ position: "relative" }}
                onClick={function () { setPrintTarget({ id: "umoor", label: u, umoor: u }); setTimeout(function () { window.print(); }, 300); }}
              >
                <button className="btn-xls-mini" title="Download as Excel" onClick={function (e) { e.stopPropagation(); exportReportXLS("umoor", u); }}>📊 XLS</button>
                <div className="umoor-name" style={{ fontSize: 12 }}>{u}</div>
                <div className="umoor-count">{count} files · Click to Print</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-Sector report cards */}
      {areaSectors.length > 0 && (
        <div className="card no-print" style={{ marginTop: 20 }}>
          <div className="card-hdr" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(184,152,90,.1)" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#e2d9c9" }}>Print by Area Sector</span>
          </div>
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {areaSectors.map(function (s) {
              var count = muminData.filter(function (m) { return m.area_sector === s; }).length;
              return (
                <div
                  key={s} className="umoor-card" style={{ position: "relative" }}
                  onClick={function () { setPrintTarget({ id: "sector", label: s + " — Mumin Directory", sector: s }); setTimeout(function () { window.print(); }, 300); }}
                >
                  <button className="btn-xls-mini" title="Download as Excel" onClick={function (e) { e.stopPropagation(); exportReportXLS("sector", s); }}>📊 XLS</button>
                  <div className="umoor-name" style={{ fontSize: 12 }}>{s}</div>
                  <div className="umoor-count">{count} member{count !== 1 ? "s" : ""} · Click to Print</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Print preview tables (hidden on screen, shown on print) */}
      <div style={{ marginTop: 24 }}>
        {printTarget && printTarget.id === "mumin" && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th>ITS</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Address</th><th>Sector</th><th>Masool</th><th>Status</th></tr></thead>
            <tbody>{muminData.map(function (m) { var si = getSectorInfo(m); return (<tr key={m.id}><td><span className="file-no">{m.its_number}</span></td><td>{m.name}</td><td>{getMuminAge(m)}</td><td>{m.gender}</td><td>{m.phone}</td><td>{m.address}</td><td>{m.area_sector || "—"}</td><td style={{ fontSize: 11 }}>{si.masoolName || "—"}</td><td><span className={"badge badge-" + (m.status || "").toLowerCase()}>{m.status}</span></td></tr>); })}</tbody>
          </table>
        )}
        {printTarget && printTarget.id === "files_all" && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th>File No.</th><th>Title</th><th>Umoor</th><th>Year</th><th>Status</th><th>Due Date</th></tr></thead>
            <tbody>{filesData.map(function (f) { return (<tr key={f.id}><td><span className="file-no">{f.file_no}</span></td><td>{f.title}</td><td style={{ fontSize: 11 }}>{f.umoor_type}</td><td>{f.year}</td><td><span className={"badge badge-" + (f.status || "").toLowerCase()}>{f.status}</span></td><td>{f.due_date || "—"}</td></tr>); })}</tbody>
          </table>
        )}
        {printTarget && printTarget.id === "reminders" && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th>File No.</th><th>Title</th><th>Umoor</th><th>Status</th><th>Due Date</th></tr></thead>
            <tbody>{filesData.filter(function (f) { return f.due_date; }).sort(function (a, b) { return new Date(a.due_date) - new Date(b.due_date); }).map(function (f) { return (<tr key={f.id}><td><span className="file-no">{f.file_no}</span></td><td>{f.title}</td><td style={{ fontSize: 11 }}>{f.umoor_type}</td><td><span className={"badge badge-" + (f.status || "").toLowerCase()}>{f.status}</span></td><td>{f.due_date}</td></tr>); })}</tbody>
          </table>
        )}
        {printTarget && printTarget.id === "age_groups" && (function () {
          var groups = [{ label: "Children (0-15)", min: 0, max: 15 }, { label: "Youth (16-30)", min: 16, max: 30 }, { label: "Adults (31-60)", min: 31, max: 60 }, { label: "Seniors (61+)", min: 61, max: 999 }];
          return (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th>Age Group</th><th>Count</th><th>Male</th><th>Female</th><th>% of Total</th></tr></thead>
              <tbody>{groups.map(function (g) {
                var mem = muminData.filter(function (m) { var a = getMuminAge(m); return a !== null && a >= g.min && a <= g.max; });
                var male = mem.filter(function (m) { return m.gender === "Male"; }).length;
                var pct = muminData.length > 0 ? ((mem.length / muminData.length) * 100).toFixed(1) : 0;
                return (<tr key={g.label}><td>{g.label}</td><td style={{ fontWeight: 600 }}>{mem.length}</td><td>{male}</td><td>{mem.length - male}</td><td>{pct}%</td></tr>);
              })}</tbody>
            </table>
          );
        })()}
        {printTarget && printTarget.id === "sector_summary" && (function () {
          return (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th>Area Sector</th><th>Masool</th><th>Members</th><th>Male</th><th>Female</th><th>% of Total</th></tr></thead>
              <tbody>{areaSectors.map(function (s) {
                var mem = muminData.filter(function (m) { return m.area_sector === s; });
                var male = mem.filter(function (m) { return m.gender === "Male"; }).length;
                var pct = muminData.length > 0 ? ((mem.length / muminData.length) * 100).toFixed(1) : 0;
                var secObj = sectorsData.find(function (x) { return x.name === s; });
                var masoolLbl = secObj ? (secObj.masool_its ? (getMuminByIts(secObj.masool_its) ? getMuminByIts(secObj.masool_its).name : secObj.masool_its) : (secObj.masool_name || "—")) : "—";
                return (<tr key={s}><td style={{ fontWeight: 500 }}>{s}</td><td style={{ fontSize: 11 }}>{masoolLbl}</td><td style={{ fontWeight: 600 }}>{mem.length}</td><td>{male}</td><td>{mem.length - male}</td><td>{pct}%</td></tr>);
              })}
              {(function () {
                var noSector = muminData.filter(function (m) { return !m.area_sector || !m.area_sector.trim(); });
                if (noSector.length === 0) return null;
                var male = noSector.filter(function (m) { return m.gender === "Male"; }).length;
                var pct = muminData.length > 0 ? ((noSector.length / muminData.length) * 100).toFixed(1) : 0;
                return <tr key="none"><td style={{ fontStyle: "italic", color: "#888" }}>Not Assigned</td><td>—</td><td style={{ fontWeight: 600 }}>{noSector.length}</td><td>{male}</td><td>{noSector.length - male}</td><td>{pct}%</td></tr>;
              })()}
              </tbody>
            </table>
          );
        })()}
        {printTarget && printTarget.id === "families" && (function () {
          var groups = {};
          muminData.forEach(function (m) {
            if (m.sabil_no && String(m.sabil_no).trim()) {
              var key = String(m.sabil_no).trim();
              if (!groups[key]) groups[key] = [];
              groups[key].push(m);
            }
          });
          var keys = Object.keys(groups).sort();
          return (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th>Sabil No.</th><th>Members</th><th>Names</th></tr></thead>
              <tbody>{keys.map(function (k) { return (<tr key={k}><td style={{ fontWeight: 600, color: "#8a6a1a" }}>{k}</td><td>{groups[k].length}</td><td style={{ fontSize: 12 }}>{groups[k].map(function (m) { return m.name; }).join(", ")}</td></tr>); })}</tbody>
            </table>
          );
        })()}
        {printTarget && printTarget.id === "sector" && (function () {
          var secObj = sectorsData.find(function (x) { return x.name === printTarget.sector; });
          var masoolLbl = secObj ? (secObj.masool_its ? (getMuminByIts(secObj.masool_its) ? getMuminByIts(secObj.masool_its).name : secObj.masool_its) : (secObj.masool_name || "—")) : "—";
          return (
            <div>
              <div style={{ border: "1px solid #f0e6cc", background: "#fffdf7", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#333" }}>
                <strong style={{ color: "#8a6a1a" }}>Masool of {printTarget.sector}:</strong> {masoolLbl}
                {secObj && secObj.masool_phone && <span style={{ marginLeft: 10, color: "#666" }}>· {secObj.masool_phone}</span>}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th>ITS</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Address</th><th>Sub-Sector</th><th>Musaid</th><th>Status</th></tr></thead>
                <tbody>{muminData.filter(function (m) { return m.area_sector === printTarget.sector; }).map(function (m) {
                  var si = getSectorInfo(m);
                  return (<tr key={m.id}><td><span className="file-no">{m.its_number}</span></td><td>{m.name}</td><td>{getMuminAge(m)}</td><td>{m.gender}</td><td>{m.phone}</td><td>{m.address}</td><td style={{ fontSize: 11 }}>{si.subSectorName || "—"}</td><td style={{ fontSize: 11 }}>{si.musaidName || "—"}</td><td><span className={"badge badge-" + (m.status || "").toLowerCase()}>{m.status}</span></td></tr>);
                })}</tbody>
              </table>
            </div>
          );
        })()}
        {printTarget && printTarget.id === "umoor" && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th>File No.</th><th>Title</th><th>Year</th><th>Date</th><th>Status</th><th>Due Date</th></tr></thead>
            <tbody>{filesData.filter(function (f) { return f.umoor_type === printTarget.umoor; }).map(function (f) { return (<tr key={f.id}><td><span className="file-no">{f.file_no}</span></td><td>{f.title}</td><td>{f.year}</td><td>{f.date || "—"}</td><td><span className={"badge badge-" + (f.status || "").toLowerCase()}>{f.status}</span></td><td>{f.due_date || "—"}</td></tr>); })}</tbody>
          </table>
        )}
        {printTarget && printTarget.id === "masool_directory" && (function () {
          var rows = [];
          sectorsData.forEach(function (sec) {
            var secMasoolName = sec.masool_its ? (getMuminByIts(sec.masool_its) ? getMuminByIts(sec.masool_its).name : sec.masool_its) : (sec.masool_name || "—");
            var subs = getSubSectorsFor(sec.id);
            if (subs.length === 0) {
              rows.push({ key: sec.id + "-none", sector: sec.name, masool: secMasoolName, masoolPhone: sec.masool_phone || "—", sub: "—", musaid: "—", musaidPhone: "—" });
            } else {
              subs.forEach(function (sub) {
                var subMusaidName = sub.musaid_its ? (getMuminByIts(sub.musaid_its) ? getMuminByIts(sub.musaid_its).name : sub.musaid_its) : (sub.musaid_name || "—");
                rows.push({ key: sub.id, sector: sec.name, masool: secMasoolName, masoolPhone: sec.masool_phone || "—", sub: sub.name, musaid: subMusaidName, musaidPhone: sub.musaid_phone || "—" });
              });
            }
          });
          return (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th>Sector</th><th>Masool</th><th>Masool Phone</th><th>Sub-Sector</th><th>Musaid</th><th>Musaid Phone</th></tr></thead>
              <tbody>{rows.map(function (r) { return (<tr key={r.key}><td style={{ fontWeight: 500 }}>{r.sector}</td><td>{r.masool}</td><td style={{ fontSize: 11 }}>{r.masoolPhone}</td><td>{r.sub}</td><td>{r.musaid}</td><td style={{ fontSize: 11 }}>{r.musaidPhone}</td></tr>); })}</tbody>
            </table>
          );
        })()}
        {printTarget && printTarget.id === "activity_log" && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th>Date & Time</th><th>User</th><th>Action</th><th>Type</th><th>Entity</th></tr></thead>
            <tbody>{activityLog.map(function (a) { return (<tr key={a.id}><td style={{ fontSize: 11 }}>{a.created_at ? new Date(a.created_at).toLocaleString() : "—"}</td><td>{a.user_email || "—"}</td><td>{a.action || "—"}</td><td>{a.entity_type || "—"}</td><td>{a.entity_name || "—"}</td></tr>); })}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
