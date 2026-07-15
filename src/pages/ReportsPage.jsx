import { useAppContext } from "../context/AppContext.jsx";
import { UMOOR_TYPES } from "../lib/constants.js";
import { getMuminAge } from "../lib/utils.js";

export function ReportsPage() {
  var ctx = useAppContext();
  var muminData = ctx.muminData, filesData = ctx.filesData, areaSectors = ctx.areaSectors;
  var sectorsData = ctx.sectorsData;
  var printTarget = ctx.printTarget, setPrintTarget = ctx.setPrintTarget;
  var exportReportXLS = ctx.exportReportXLS, getSectorInfo = ctx.getSectorInfo, getMuminByIts = ctx.getMuminByIts;

  return (
    <div className="w-full flex-1 p-6 md:p-9 lg:ml-[260px]">
      {/* Interactive Title Element Block */}
      <div className="mb-8 no-print">
        <div className="font-sans text-2xl font-bold text-brand-gold sm:text-[28px]">Reports Engine</div>
        <div className="mt-1 text-xs text-brand-muted sm:text-[13px]">Print, verify and export formatted workspace datasets</div>
      </div>

      {/* High-Fidelity Local Print Header Hook */}
      <div className="hidden print:block text-center pb-3 mb-5 border-b-2 border-brand-gold text-brand-bg">
        <h2 className="text-xl font-bold text-black">Husaini Mohallah Database &mdash; {printTarget && printTarget.label}</h2>
        <p className="text-xs text-gray-600 mt-1">System Audit Sheet &bull; Generated: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Grid Menu Array Layout */}
      <div className="grid grid-cols-1 gap-4 mb-7 sm:grid-cols-2 lg:grid-cols-3 no-print">
        {[
          { id: "mumin", icon: "📋", label: "Mumin Directory", desc: "Full list of all registered members", data: muminData.length + " members" },
          { id: "files_all", icon: "📁", label: "All Umoor Files", desc: "Complete file list across all departments", data: filesData.length + " files" },
          { id: "reminders", icon: "⏰", label: "Reminders Report", desc: "All files with due dates overdue and upcoming", data: filesData.filter(function (f) { return f.due_date; }).length + " tracked items" },
          { id: "families", icon: "👨‍👩‍👧‍👦", label: "Family Directory", desc: "Members grouped by shared Sabil No.", data: (function () { var s = {}; muminData.forEach(function (m) { if (m.sabil_no && String(m.sabil_no).trim()) s[String(m.sabil_no).trim()] = 1; }); return Object.keys(s).length + " sabil groups"; })() },
          { id: "age_groups", icon: "📊", label: "Age Group Summary", desc: "Members broken down by age group metrics", data: muminData.length + " members" },
          { id: "sector_summary", icon: "🗺️", label: "Sector Summary", desc: "Member count breakdown by area sector", data: areaSectors.length + " sectors" },
        ].map(function (r) {
          return (
            <div 
              key={r.id} 
              className="relative bg-white/[0.02] border border-brand-gold/10 rounded-xl p-4 pt-5 cursor-pointer transition-all duration-200 hover:border-brand-gold/30 hover:bg-brand-gold/[0.05]"
              onClick={function () { setPrintTarget(r); setTimeout(function () { window.print(); }, 300); }}
            >
              <button 
                className="absolute top-2 right-2 bg-brand-success/10 border border-brand-success/25 text-brand-success text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer transition-all hover:bg-brand-success/20 z-[2]" 
                onClick={function (e) { e.stopPropagation(); exportReportXLS(r.id); }}
              >
                XLS
              </button>
              <div className="text-3xl mb-2">{r.icon}</div>
              <div className="text-sm font-medium text-brand-text mb-1">{r.label}</div>
              <div className="text-[11px] text-brand-muted leading-relaxed mb-3 pr-8">{r.desc}</div>
              <div className="text-[10px] text-brand-gold font-medium border-t border-brand-gold/5 pt-2 flex items-center justify-between">
                <span>{r.data}</span>
                <span className="opacity-60">Click to Print &rarr;</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-Umoor Department Report Matrix Wrapper */}
      <div className="bg-white/[0.02] border border-brand-gold/10 rounded-xl overflow-hidden mb-6 no-print">
        <div className="px-6 py-4 border-b border-brand-gold/10 bg-brand-panel/10">
          <span className="text-sm font-semibold text-brand-text">Print Report by Umoor Department</span>
        </div>
        <div className="p-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {UMOOR_TYPES.map(function (u) {
            var count = filesData.filter(function (f) { return f.umoor_type === u; }).length;
            return (
              <div 
                key={u} 
                className="relative bg-white/[0.02] border border-brand-gold/10 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-brand-gold/30 hover:bg-brand-gold/[0.05]"
                onClick={function () { setPrintTarget({ id: "umoor", label: u, umoor: u }); setTimeout(function () { window.print(); }, 300); }}
              >
                <button 
                  className="absolute top-2 right-2 bg-brand-success/10 border border-brand-success/25 text-brand-success text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer transition-all hover:bg-brand-success/20 z-[2]" 
                  onClick={function (e) { e.stopPropagation(); exportReportXLS("umoor", u); }}
                >
                  XLS
                </button>
                <div className="text-xs font-medium text-brand-text pr-8 truncate" title={u}>{u}</div>
                <div className="text-[11px] text-brand-muted mt-1">{count} files &bull; Click to Print</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-Sector Mumin Directory Section */}
      {areaSectors.length > 0 && (         
        <div className="bg-white/[0.02] border border-brand-gold/10 rounded-xl overflow-hidden no-print">
          <div className="px-6 py-4 border-b border-brand-gold/10 bg-brand-panel/10">
            <span className="text-sm font-semibold text-brand-text">Print Mumin Records by Area Sector Scope</span>
          </div>
          <div className="p-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areaSectors.map(function (s) {
              var count = muminData.filter(function (m) { return m.area_sector === s; }).length;
              return (
                <div 
                  key={s} 
                  className="relative bg-white/[0.02] border border-brand-gold/10 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:border-brand-gold/30 hover:bg-brand-gold/[0.05]"
                  onClick={function () { setPrintTarget({ id: "sector", label: s + " Mumin Directory", sector: s }); setTimeout(function () { window.print(); }, 300); }}
                >
                  <button 
                    className="absolute top-2 right-2 bg-brand-success/10 border border-brand-success/25 text-brand-success text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer transition-all hover:bg-brand-success/20 z-[2]" 
                    onClick={function (e) { e.stopPropagation(); exportReportXLS("sector", s); }}
                  >
                    XLS
                  </button>
                  <div className="text-xs font-medium text-brand-text pr-8 truncate">{s}</div>
                  <div className="text-[11px] text-brand-muted mt-1">{count} member{count !== 1 ? "s" : ""} &bull; Click to Print</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* High-Fidelity Printable Template Tables Layout Block */}
      <div className="mt-6 hidden print:block text-black">
        {printTarget && printTarget.id === "mumin" && (
          <table className="w-full border-collapse text-left text-xs text-black">
            <thead>
              <tr className="border-b-2 border-gray-300 font-semibold">
                <th className="py-2">ITS No.</th><th className="py-2">Name</th><th className="py-2">Age</th><th className="py-2">Gender</th><th className="py-2">Phone</th><th className="py-2">Address</th><th className="py-2">Sector</th><th className="py-2">Masool</th><th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {muminData.map(function (m) { 
                var si = getSectorInfo(m); 
                return (
                  <tr key={m.id}>
                    <td className="py-2 font-mono">{m.its_number}</td>
                    <td className="py-2 font-medium">{m.name}</td>
                    <td className="py-2">{getMuminAge(m)}</td>
                    <td className="py-2">{m.gender}</td>
                    <td className="py-2">{m.phone}</td>
                    <td className="py-2 text-[11px] max-w-[180px] truncate">{m.address}</td>
                    <td className="py-2">{m.area_sector || "—"}</td>
                    <td className="py-2 text-[11px]">{si.masoolName || "—"}</td>
                    <td className="py-2">{m.status}</td>
                  </tr>
                ); 
              })}
            </tbody>
          </table>
        )}

        {printTarget && printTarget.id === "files_all" && (
          <table className="w-full border-collapse text-left text-xs text-black">
            <thead>
              <tr className="border-b-2 border-gray-300 font-semibold">
                <th className="py-2">File No.</th><th className="py-2">Title</th><th className="py-2">Umoor</th><th className="py-2">Year</th><th className="py-2">Status</th><th className="py-2">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filesData.map(function (f) { 
                return (
                  <tr key={f.id}>
                    <td className="py-2 font-mono text-brand-gold-dark">{f.file_no}</td>
                    <td className="py-2 font-medium">{f.title}</td>
                    <td className="py-2 text-[11px]">{f.umoor_type}</td>
                    <td className="py-2">{f.year}</td>
                    <td className="py-2">{f.status}</td>
                    <td className="py-2 font-mono">{f.due_date || "—"}</td>
                  </tr>
                ); 
              })}
            </tbody>
          </table>
        )}

        {printTarget && printTarget.id === "reminders" && (
          <table className="w-full border-collapse text-left text-xs text-black">
            <thead>
              <tr className="border-b-2 border-gray-300 font-semibold">
                <th className="py-2">File No.</th><th className="py-2">Title</th><th className="py-2">Umoor Dept</th><th className="py-2">Status</th><th className="py-2">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filesData.filter(function (f) { return f.due_date; }).sort(function (a, b) { return new Date(a.due_date) - new Date(b.due_date); }).map(function (f) { 
                return (
                  <tr key={f.id}>
                    <td className="py-2 font-mono">{f.file_no}</td>
                    <td className="py-2 font-medium">{f.title}</td>
                    <td className="py-2 text-[11px]">{f.umoor_type}</td>
                    <td className="py-2">{f.status}</td>
                    <td className="py-2 font-mono font-semibold">{f.due_date}</td>
                  </tr>
                ); 
              })}
            </tbody>
          </table>
        )}

        {printTarget && printTarget.id === "age_groups" && (function () {
          var groups = [{ label: "Children (0-15)", min: 0, max: 15 }, { label: "Youth (16-30)", min: 16, max: 30 }, { label: "Adults (31-60)", min: 31, max: 60 }, { label: "Seniors (61+)", min: 61, max: 999 }];
          return (
            <table className="w-full border-collapse text-left text-xs text-black">
              <thead>
                <tr className="border-b-2 border-gray-300 font-semibold">
                  <th className="py-2">Age Group Scope</th><th className="py-2">Total Count</th><th className="py-2">Male</th><th className="py-2">Female</th><th className="py-2">% Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {groups.map(function (g) {
                  var mem = muminData.filter(function (m) { var a = getMuminAge(m); return a !== null && a >= g.min && a <= g.max; });
                  var male = mem.filter(function (m) { return m.gender === "Male"; }).length;
                  var pct = muminData.length > 0 ? ((mem.length / muminData.length) * 100).toFixed(1) : 0;
                  return (
                    <tr key={g.label}>
                      <td className="py-2 font-medium">{g.label}</td>
                      <td className="py-2 font-bold">{mem.length}</td>
                      <td className="py-2">{male}</td>
                      <td className="py-2">{mem.length - male}</td>
                      <td className="py-2 font-mono">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}

        {printTarget && printTarget.id === "sector_summary" && (function () {
          return (
            <table className="w-full border-collapse text-left text-xs text-black">
              <thead>
                <tr className="border-b-2 border-gray-300 font-semibold">
                  <th className="py-2">Area Sector Scope</th><th className="py-2">Masool Assigned</th><th className="py-2">Members</th><th className="py-2">Male</th><th className="py-2">Female</th><th className="py-2">% Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {areaSectors.map(function (s) {
                  var mem = muminData.filter(function (m) { return m.area_sector === s; });
                  var male = mem.filter(function (m) { return m.gender === "Male"; }).length;
                  var pct = muminData.length > 0 ? ((mem.length / muminData.length) * 100).toFixed(1) : 0;
                  var secObj = sectorsData.find(function (x) { return x.name === s; });
                  var masoolLbl = secObj ? (secObj.masool_its ? (getMuminByIts(secObj.masool_its) ? getMuminByIts(secObj.masool_its).name : secObj.masool_its) : (secObj.masool_name || " ")) : "";
                  return (
                    <tr key={s}>
                      <td className="py-2 font-semibold">{s}</td>
                      <td className="py-2 text-[11px]">{masoolLbl}</td>
                      <td className="py-2 font-bold">{mem.length}</td>
                      <td className="py-2">{male}</td>
                      <td className="py-2">{mem.length - male}</td>
                      <td className="py-2 font-mono">{pct}%</td>
                    </tr>
                  );
                })}
                {(function () {
                  var noSector = muminData.filter(function (m) { return !m.area_sector || !m.area_sector.trim(); });
                  if (noSector.length === 0) return null;
                  var male = noSector.filter(function (m) { return m.gender === "Male"; }).length;
                  var pct = muminData.length > 0 ? ((noSector.length / muminData.length) * 100).toFixed(1) : 0;
                  return (
                    <tr key="none">
                      <td className="py-2 italic text-gray-500">Not Assigned Pool</td>
                      <td className="py-2">&mdash;</td>
                      <td className="py-2 font-bold">{noSector.length}</td>
                      <td className="py-2">{male}</td>
                      <td className="py-2">{noSector.length - male}</td>
                      <td className="py-2 font-mono">{pct}%</td>
                    </tr>
                  );
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
            <table className="w-full border-collapse text-left text-xs text-black">
              <thead>
                <tr className="border-b-2 border-gray-300 font-semibold">
                  <th className="py-2">Sabil No.</th><th className="py-2">Total Size</th><th className="py-2">Grouped Family Member Names</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {keys.map(function (k) { 
                  return (
                    <tr key={k}>
                      <td className="py-2 font-mono font-bold text-brand-gold-dark">{k}</td>
                      <td className="py-2 font-medium">{groups[k].length} pax</td>
                      <td className="py-2 text-gray-700">{groups[k].map(function (m) { return m.name; }).join(", ")}</td>
                    </tr>
                  ); 
                })}
              </tbody>
            </table>
          );
        })()}

        {printTarget && printTarget.id === "sector" && (function () {
          var secObj = sectorsData.find(function (x) { return x.name === printTarget.sector; });
          var masoolLbl = secObj ? (secObj.masool_its ? (getMuminByIts(secObj.masool_its) ? getMuminByIts(secObj.masool_its).name : secObj.masool_its) : (secObj.masool_name || " ")) : "";
          return (
            <div>
              <div className="border border-gray-300 bg-gray-50 rounded-lg p-3 mb-4 text-xs text-black">
                <strong>Assigned Sector Masool Head for {printTarget.sector}:</strong> {masoolLbl}
                {secObj && secObj.masool_phone && <span className="ml-3 text-gray-600">&bull; Contact: {secObj.masool_phone}</span>}
              </div>
              <table className="w-full border-collapse text-left text-xs text-black">
                <thead>
                  <tr className="border-b-2 border-gray-300 font-semibold">
                    <th className="py-2">ITS No.</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Address</th><th>Sub-Sector</th><th>Musaid Scope</th><th>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {muminData.filter(function (m) { return m.area_sector === printTarget.sector; }).map(function (m) {
                    var si = getSectorInfo(m);
                    return (
                      <tr key={m.id}>
                        <td className="py-2 font-mono">{m.its_number}</td>
                        <td className="py-2 font-medium">{m.name}</td>
                        <td className="py-2">{getMuminAge(m)}</td>
                        <td className="py-2">{m.gender}</td>
                        <td className="py-2">{m.phone}</td>
                        <td className="py-2 text-[11px] max-w-[140px] truncate">{m.address}</td>
                        <td className="py-2 text-[11px]">{si.subSectorName || "—"}</td>
                        <td className="py-2 text-[11px]">{si.musaidName || "—"}</td>
                        <td className="py-2">{m.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}

        {printTarget && printTarget.id === "umoor" && (
          <table className="w-full border-collapse text-left text-xs text-black">
            <thead>
              <tr className="border-b-2 border-gray-300 font-semibold">
                <th className="py-2">File No.</th><th className="py-2">Title</th><th className="py-2">Year Scope</th><th className="py-2">Date Added</th><th className="py-2">Status</th><th className="py-2">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filesData.filter(function (f) { return f.umoor_type === printTarget.umoor; }).map(function (f) { 
                return (
                  <tr key={f.id}>
                    <td className="py-2 font-mono font-semibold">{f.file_no}</td>
                    <td className="py-2 font-medium">{f.title}</td>
                    <td className="py-2">{f.year}</td>
                    <td className="py-2 text-gray-600">{f.date || "—"}</td>
                    <td className="py-2">{f.status}</td>
                    <td className="py-2 font-mono">{f.due_date || "—"}</td>
                  </tr>
                ); 
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}