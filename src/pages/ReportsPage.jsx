import { useAppContext } from "../context/AppContext.jsx";
import { getMuminAge } from "../lib/utils.js";

export function ReportsPage() {
  var ctx = useAppContext();
  var muminData = ctx.muminData, areaSectors = ctx.areaSectors, sectorsData = ctx.sectorsData, activityLog = ctx.activityLog;
  var printTarget = ctx.printTarget, setPrintTarget = ctx.setPrintTarget;
  var exportReportXLS = ctx.exportReportXLS, getSectorInfo = ctx.getSectorInfo;

  var reports = [
    { id: "mumin", icon: "👤", label: "Mumin Directory", desc: "Full list of registered members", data: muminData.length + " members" },
    { id: "families", icon: "🏠", label: "Family Directory", desc: "Members grouped by Sabil No.", data: muminData.filter(function (m) { return m.sabil_no && String(m.sabil_no).trim(); }).length + " members" },
    { id: "age_groups", icon: "📊", label: "Age Group Summary", desc: "Members by age group", data: muminData.length + " members" },
    { id: "sector_summary", icon: "📍", label: "Sector Summary", desc: "Member breakdown by area sector", data: areaSectors.length + " sectors" },
    { id: "masool_directory", icon: "🧭", label: "Masool Directory", desc: "Sectors, Masool & Musaid contacts", data: sectorsData.length + " sectors" },
    { id: "activity_log", icon: "🕘", label: "Activity Log", desc: "History of system actions", data: activityLog.length + " entries" },
  ];

  function printReport(r) { setPrintTarget(r); setTimeout(function () { window.print(); }, 300); }

  return (
    <div>
      <div className="page-hdr no-print"><div className="page-title">Reports</div><div className="page-sub">Print and export formatted reports</div></div>
      <div className="print-header" id="print-header"><h2>Husaini Mohallah — {printTarget && printTarget.label}</h2><p>Generated: {new Date().toLocaleDateString()}</p></div>
      <div className="no-print" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        {reports.map(function (r) {
          return <div key={r.id} className="umoor-card" style={{ cursor: "pointer", position: "relative" }} onClick={function () { printReport(r); }}>
            <button className="btn-xls-mini" title="Download as Excel" onClick={function (e) { e.stopPropagation(); exportReportXLS(r.id); }}>📊 XLS</button>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{r.icon}</div><div className="umoor-name" style={{ fontSize: 14, marginBottom: 4 }}>{r.label}</div><div className="umoor-count">{r.desc}</div><div style={{ marginTop: 10, fontSize: 11, color: "#c9a84c" }}>{r.data} · Click to Print</div>
          </div>;
        })}
      </div>

      {areaSectors.length > 0 && <div className="card no-print" style={{ marginTop: 20 }}>
        <div className="card-hdr" style={{ padding: "16px 24px", borderBottom: "1px solid rgba(184,152,90,.1)" }}><span style={{ fontSize: 14, fontWeight: 600, color: "#e2d9c9" }}>Print by Area Sector</span></div>
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {areaSectors.map(function (s) { var count = muminData.filter(function (m) { return m.area_sector === s; }).length; return <div key={s} className="umoor-card" style={{ position: "relative" }} onClick={function () { printReport({ id: "sector", label: s + " — Mumin Directory", sector: s }); }}><button className="btn-xls-mini" title="Download as Excel" onClick={function (e) { e.stopPropagation(); exportReportXLS("sector", s); }}>📊 XLS</button><div className="umoor-name" style={{ fontSize: 12 }}>{s}</div><div className="umoor-count">{count} member{count !== 1 ? "s" : ""} · Click to Print</div></div>; })}
        </div>
      </div>}

      <div style={{ marginTop: 24 }}>
        {printTarget && printTarget.id === "mumin" && <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th>ITS</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Address</th><th>Sector</th><th>Masool</th><th>Status</th></tr></thead><tbody>{muminData.map(function (m) { var si = getSectorInfo(m); return <tr key={m.id}><td>{m.its_number}</td><td>{m.name}</td><td>{getMuminAge(m)}</td><td>{m.gender}</td><td>{m.phone}</td><td>{m.address}</td><td>{m.area_sector || "—"}</td><td>{si.masoolName || "—"}</td><td>{m.status}</td></tr>; })}</tbody></table>}
        {printTarget && printTarget.id === "families" && (function () { var groups = {}; muminData.forEach(function (m) { if (m.sabil_no && String(m.sabil_no).trim()) { var k = String(m.sabil_no).trim(); if (!groups[k]) groups[k] = []; groups[k].push(m); } }); return <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th>Sabil No.</th><th>Members</th><th>Names</th></tr></thead><tbody>{Object.keys(groups).sort().map(function (k) { return <tr key={k}><td>{k}</td><td>{groups[k].length}</td><td>{groups[k].map(function (m) { return m.name; }).join(", ")}</td></tr>; })}</tbody></table>; })()}
        {printTarget && printTarget.id === "age_groups" && (function () { var groups = [{ label: "Children (0-15)", min: 0, max: 15 }, { label: "Youth (16-30)", min: 16, max: 30 }, { label: "Adults (31-60)", min: 31, max: 60 }, { label: "Seniors (61+)", min: 61, max: 999 }]; return <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th>Age Group</th><th>Count</th><th>Male</th><th>Female</th></tr></thead><tbody>{groups.map(function (g) { var mem = muminData.filter(function (m) { var a = getMuminAge(m); return a !== null && a >= g.min && a <= g.max; }); var male = mem.filter(function (m) { return m.gender === "Male"; }).length; return <tr key={g.label}><td>{g.label}</td><td>{mem.length}</td><td>{male}</td><td>{mem.length - male}</td></tr>; })}</tbody></table>; })()}
        {printTarget && printTarget.id === "sector_summary" && <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th>Area Sector</th><th>Masool</th><th>Members</th><th>Male</th><th>Female</th></tr></thead><tbody>{areaSectors.map(function (s) { var mem = muminData.filter(function (m) { return m.area_sector === s; }); var male = mem.filter(function (m) { return m.gender === "Male"; }).length; var sec = sectorsData.find(function (x) { return x.name === s; }); var si = sec && sec.masool_its ? ctx.getMuminByIts(sec.masool_its) : null; return <tr key={s}><td>{s}</td><td>{si ? si.name : (sec && sec.masool_name) || "—"}</td><td>{mem.length}</td><td>{male}</td><td>{mem.length - male}</td></tr>; })}</tbody></table>}
        {printTarget && printTarget.id === "sector" && (function () { var mem = muminData.filter(function (m) { return m.area_sector === printTarget.sector; }); return <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th>ITS</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Status</th></tr></thead><tbody>{mem.map(function (m) { return <tr key={m.id}><td>{m.its_number}</td><td>{m.name}</td><td>{getMuminAge(m)}</td><td>{m.gender}</td><td>{m.phone}</td><td>{m.status}</td></tr>; })}</tbody></table>; })()}
        {printTarget && printTarget.id === "masool_directory" && <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th>Sector</th><th>Masool</th><th>Masool Phone</th></tr></thead><tbody>{sectorsData.map(function (s) { var m = s.masool_its ? ctx.getMuminByIts(s.masool_its) : null; return <tr key={s.id}><td>{s.name}</td><td>{m ? m.name : (s.masool_name || "—")}</td><td>{s.masool_phone || "—"}</td></tr>; })}</tbody></table>}
        {printTarget && printTarget.id === "activity_log" && <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th>Date</th><th>User</th><th>Action</th><th>Entity</th></tr></thead><tbody>{activityLog.map(function (a) { return <tr key={a.id}><td>{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</td><td>{a.user_email}</td><td>{a.action}</td><td>{a.entity_type} — {a.entity_name}</td></tr>; })}</tbody></table>}
      </div>
    </div>
  );
}
