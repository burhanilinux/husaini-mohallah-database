import { useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { getExtendedProfile } from "../lib/muminProfile.js";

export function DataQualityPage() {
  var ctx = useAppContext();
  var muminData = ctx.muminData || [];
  var [filter, setFilter] = useState("all");

  var issues = useMemo(function () {
    var out = [];
    var itsSeen = {};
    muminData.forEach(function (m) {
      var its = String(m.its_id || m.its_number || "").trim();
      if (its) { if (itsSeen[its]) out.push({ type: "duplicate_its", label: "Duplicate ITS", m: m, detail: "Same ITS appears more than once." }); else itsSeen[its] = m.id; }
      if (!its) out.push({ type: "missing_its", label: "Missing ITS", m: m, detail: "Member has no ITS number." });
      if (!m.name || !String(m.name).trim()) out.push({ type: "missing_name", label: "Missing name", m: m, detail: "Member name is blank." });
      if (!m.family_id) out.push({ type: "no_family", label: "No family", m: m, detail: "Member is not linked to a family." });
      if (!m.area_sector) out.push({ type: "no_sector", label: "No sector", m: m, detail: "Member is not assigned to an area sector." });
      if (!m.dob && (m.age === null || m.age === undefined || m.age === "")) out.push({ type: "missing_age", label: "Missing age/DOB", m: m, detail: "Neither DOB nor age is available." });
      if (!m.phone) out.push({ type: "missing_phone", label: "Missing phone", m: m, detail: "No phone number is recorded." });

      var ext = getExtendedProfile(m);
      if (!ext.bloodGroup) out.push({ type: "missing_blood_group", label: "Missing blood group", m: m, detail: "No blood group on record — relevant for emergencies." });
      if (ext.dataVerificationStatus && !ext.isDataVerified) out.push({ type: "not_data_verified", label: "Data not verified", m: m, detail: "Marked \"" + ext.dataVerificationStatus + "\" in the source export." });
      if (ext.photoVerificationStatus && !ext.isPhotoVerified) out.push({ type: "photo_not_verified", label: "Photo not verified", m: m, detail: "Marked \"" + ext.photoVerificationStatus + "\" — affects ID card reliability." });
    });
    var counts = {};
    out.forEach(function (x) { counts[x.type] = (counts[x.type] || 0) + 1; });
    return { out: out, counts: counts };
  }, [muminData]);

  var filtered = filter === "all" ? issues.out : issues.out.filter(function (x) { return x.type === filter; });
  var categories = [
    ["no_family", "No family"], ["no_sector", "No sector"], ["missing_phone", "Missing phone"], ["missing_age", "Missing age/DOB"],
    ["missing_its", "Missing ITS"], ["duplicate_its", "Duplicate ITS"], ["missing_name", "Missing name"],
    ["missing_blood_group", "Missing blood group"], ["not_data_verified", "Data not verified"], ["photo_not_verified", "Photo not verified"],
  ];

  return <div>
    <div className="page-hdr"><div className="page-title">Data Quality</div><div className="page-sub">Find incomplete, inconsistent and duplicate records before they affect reports</div></div>
    <div className="stats-grid">
      <div className="stat-card"><div className="stat-lbl">Total issues</div><div className="stat-val">{issues.out.length}</div><div className="stat-desc">Across {muminData.length} members</div></div>
      {categories.slice(0, 3).map(function (c) { return <div className="stat-card" key={c[0]}><div className="stat-lbl">{c[1]}</div><div className="stat-val">{issues.counts[c[0]] || 0}</div><div className="stat-desc">Records requiring review</div></div>; })}
    </div>
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-hdr"><span className="card-title">Quality Issues ({filtered.length})</span><select value={filter} onChange={function (e) { setFilter(e.target.value); }} style={{ width: 220 }}><option value="all">All issues</option>{categories.map(function (c) { return <option key={c[0]} value={c[0]}>{c[1]} ({issues.counts[c[0]] || 0})</option>; })}</select></div>
      {filtered.length === 0 ? <div className="empty"><div className="empty-icon">✓</div><div>No issues found for this filter.</div></div> : <table><thead><tr><th>Issue</th><th>ITS</th><th>Name</th><th>Family</th><th>Sector</th><th>Details</th><th>Action</th></tr></thead><tbody>{filtered.slice(0, 500).map(function (x, i) { return <tr key={String(x.m.id) + "-" + x.type + "-" + i}><td><span className="badge" style={{ color: "#f59e0b" }}>{x.label}</span></td><td>{x.m.its_number || x.m.its_id || "—"}</td><td style={{ fontWeight: 500 }}>{x.m.name || "—"}</td><td>{x.m.family_id || "—"}</td><td>{x.m.area_sector || "—"}</td><td style={{ color: "#6b7280", fontSize: 12 }}>{x.detail}</td><td>{ctx.setMuminPreview && <button className="btn btn-ghost btn-sm" onClick={function () { ctx.setMuminPreview(x.m); }}>Open</button>}</td></tr>; })}</tbody></table>}
      {filtered.length > 500 && <div style={{ padding: 14, color: "#6b7280", fontSize: 12 }}>Showing first 500 issues. Use the filter to narrow the list.</div>}
    </div>
  </div>;
}
