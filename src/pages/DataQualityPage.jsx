import { useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { getExtendedProfile } from "../lib/muminProfile.js";

export function DataQualityPage() {
  var ctx = useAppContext();
  var muminData = ctx.muminData || [];
  var [filter, setFilter] = useState("all");

  var analysis = useMemo(function () {
    var out = [];
    var itsMap = {};
    var hofMap = {};
    var rows = muminData.filter(function (m) { return !m.deleted_at; });

    rows.forEach(function (m) {
      var its = String(m.its_id || m.its_number || "").trim();
      if (its) {
        if (!itsMap[its]) itsMap[its] = [];
        itsMap[its].push(m);
      }
      var source = m.source_data || {};
      if (String(source.HOF_FM_TYPE || "").toUpperCase() === "HOF" && its) hofMap[its] = m;
    });

    function add(type, label, m, detail) {
      out.push({ type: type, label: label, m: m, detail: detail });
    }

    rows.forEach(function (m) {
      var its = String(m.its_id || m.its_number || "").trim();
      var source = m.source_data || {};
      var hofId = String(source.HOF_ID || "").trim();
      var isHof = String(source.HOF_FM_TYPE || "").toUpperCase() === "HOF";

      if (!its) add("missing_its", "Missing ITS", m, "Member has no ITS number.");
      if (!m.name || !String(m.name).trim()) add("missing_name", "Missing name", m, "Member name is blank.");
      if (!m.family_id && !hofId && !isHof) add("no_family", "No family", m, "No Family ID or HOF_ID relationship is recorded.");
      if (!m.area_sector) add("no_sector", "No sector", m, "Member is not assigned to an area sector.");
      if (!m.dob && (m.age === null || m.age === undefined || m.age === "")) add("missing_age", "Missing age/DOB", m, "Neither DOB nor age is available.");
      if (!m.phone) add("missing_phone", "Missing phone", m, "No phone number is recorded.");

      if (hofId && !hofMap[hofId]) {
        add("invalid_hof", "Invalid HOF link", m, "HOF_ID " + hofId + " does not resolve to a HOF record.");
      }
      if (isHof && its && rows.some(function (o) {
        var otherSource = o.source_data || {};
        return String(o.source_data && otherSource.HOF_ID || "").trim() === its && String(otherSource.HOF_FM_TYPE || "").toUpperCase() !== "HOF";
      })) {
        // Informational consistency check: HOF has members pointing back to it.
      }
      if (isHof && its && itsMap[its].length > 1) {
        add("duplicate_hof_its", "Duplicate HOF ITS", m, "More than one record uses this HOF ITS number.");
      }

      var ext = getExtendedProfile(m);
      if (!ext.bloodGroup) add("missing_blood_group", "Missing blood group", m, "No blood group is recorded.");
      if (ext.dataVerificationStatus && !ext.isDataVerified) add("not_data_verified", "Data not verified", m, "Source export marks this record as not verified.");
      if (ext.photoVerificationStatus && !ext.isPhotoVerified) add("photo_not_verified", "Photo not verified", m, "Source export marks this photo as not verified.");
    });

    Object.keys(itsMap).forEach(function (its) {
      if (itsMap[its].length > 1) {
        itsMap[its].forEach(function (m) {
          add("duplicate_its", "Duplicate ITS", m, "ITS " + its + " appears " + itsMap[its].length + " times.");
        });
      }
    });

    // Families with an HOF record but no family_id are not automatically
    // treated as errors: HOF_ID is the authoritative relationship.
    var counts = {};
    out.forEach(function (x) { counts[x.type] = (counts[x.type] || 0) + 1; });
    return { out: out, counts: counts, rows: rows };
  }, [muminData]);

  var categories = [
    ["invalid_hof", "Invalid HOF link"], ["no_family", "No family"], ["duplicate_its", "Duplicate ITS"],
    ["duplicate_hof_its", "Duplicate HOF ITS"], ["missing_phone", "Missing phone"], ["missing_age", "Missing age/DOB"],
    ["missing_its", "Missing ITS"], ["missing_name", "Missing name"], ["no_sector", "No sector"],
    ["missing_blood_group", "Missing blood group"], ["not_data_verified", "Data not verified"], ["photo_not_verified", "Photo not verified"],
  ];
  var filtered = filter === "all" ? analysis.out : analysis.out.filter(function (x) { return x.type === filter; });

  var critical = (analysis.counts.invalid_hof || 0) + (analysis.counts.duplicate_its || 0) + (analysis.counts.duplicate_hof_its || 0);
  var complete = Math.max(0, analysis.rows.length - new Set(analysis.out.map(function (x) { return x.m.id; })).size);
  var qualityPct = analysis.rows.length ? Math.round((complete / analysis.rows.length) * 100) : 100;

  return <div>
    <div className="page-hdr">
      <div className="page-title">Data Quality Dashboard</div>
      <div className="page-sub">Review duplicates, missing information and HOF relationships before they affect reports</div>
    </div>

    <div className="stats-grid">
      <div className="stat-card"><div className="stat-lbl">Quality coverage</div><div className="stat-val">{qualityPct}%</div><div className="stat-desc">{complete} of {analysis.rows.length} records have no flagged issue</div></div>
      <div className="stat-card"><div className="stat-lbl">Total issues</div><div className="stat-val">{analysis.out.length}</div><div className="stat-desc">All flagged data-quality items</div></div>
      <div className="stat-card"><div className="stat-lbl">Critical linkage</div><div className="stat-val">{critical}</div><div className="stat-desc">Duplicate or invalid HOF relationships</div></div>
      <div className="stat-card"><div className="stat-lbl">Members checked</div><div className="stat-val">{analysis.rows.length}</div><div className="stat-desc">Active database records</div></div>
    </div>

    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-hdr">
        <span className="card-title">Quality Issues ({filtered.length})</span>
        <div className="results-toolbar">
          <select value={filter} onChange={function (e) { setFilter(e.target.value); }} style={{ width: 230 }}>
            <option value="all">All issues</option>
            {categories.map(function (c) { return <option key={c[0]} value={c[0]}>{c[1]} ({analysis.counts[c[0]] || 0})</option>; })}
          </select>
        </div>
      </div>
      {filtered.length === 0 ? <div className="empty"><div className="empty-icon">✓</div><div>No issues found for this filter.</div></div> : (
        <div style={{ overflowX: "auto" }}>
          <table><thead><tr><th>Issue</th><th>ITS</th><th>Name</th><th>Family</th><th>HOF ID</th><th>Sector</th><th>Details</th><th>Action</th></tr></thead>
          <tbody>{filtered.slice(0, 1000).map(function (x, i) {
            var source = x.m.source_data || {};
            return <tr key={String(x.m.id) + "-" + x.type + "-" + i}>
              <td><span className="badge" style={{ color: "#f59e0b" }}>{x.label}</span></td>
              <td><span className="file-no">{x.m.its_number || x.m.its_id || "—"}</span></td>
              <td style={{ fontWeight: 500 }}>{x.m.name || "—"}</td>
              <td>{x.m.family_id || "—"}</td>
              <td>{source.HOF_ID || "—"}</td>
              <td>{x.m.area_sector || "—"}</td>
              <td style={{ color: "#6b7280", fontSize: 12 }}>{x.detail}</td>
              <td>{ctx.setMuminPreview && <button className="btn btn-ghost btn-sm" onClick={function () { ctx.setMuminPreview(x.m); }}>Open 360</button>}</td>
            </tr>;
          })}</tbody></table>
        </div>
      )}
      {filtered.length > 1000 && <div style={{ padding: 14, color: "#6b7280", fontSize: 12 }}>Showing first 1,000 issues. Use the filter to narrow the list.</div>}
    </div>
  </div>;
}
