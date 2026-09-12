import { useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { getMuminAge } from "../lib/utils.js";
import { getExtendedProfile } from "../lib/muminProfile.js";

export function AdvancedSearchPage() {
  var ctx = useAppContext();
  var muminData = ctx.muminData, areaSectors = ctx.areaSectors;
  var setMuminPreview = ctx.setMuminPreview;
  var [query, setQuery] = useState("");
  var [sector, setSector] = useState("");
  var [gender, setGender] = useState("");
  var [status, setStatus] = useState("");
  var [ageGroup, setAgeGroup] = useState("");
  var [hasPhone, setHasPhone] = useState("");
  var [hasSabil, setHasSabil] = useState("");

  var results = useMemo(function () {
    var q = query.trim().toLowerCase();
    return muminData.filter(function (m) {
if (q) {
  var ext = getExtendedProfile(m);
  var haystack = [(m.name || ""), (m.its_number || ""), (m.phone || ""), (m.email || ""), (m.sabil_no || ""), (m.address || ""), (ext.occupation || ""), (ext.city || ""), (ext.organisation || "")].join(" ").toLowerCase();
  if (!haystack.includes(q)) return false;
}
      if (sector && m.area_sector !== sector) return false;
      if (gender && m.gender !== gender) return false;
      if (status && m.status !== status) return false;
      if (hasPhone === "yes" && !(m.phone || "").trim()) return false;
      if (hasPhone === "no" && (m.phone || "").trim()) return false;
      if (hasSabil === "yes" && !(m.sabil_no || "").trim()) return false;
      if (hasSabil === "no" && (m.sabil_no || "").trim()) return false;
      if (ageGroup) {
        var age = getMuminAge(m);
        if (age === null || age === undefined) return false;
        if (ageGroup === "child" && age > 15) return false;
        if (ageGroup === "youth" && (age < 16 || age > 30)) return false;
        if (ageGroup === "adult" && (age < 31 || age > 60)) return false;
        if (ageGroup === "senior" && age < 61) return false;
      }
      return true;
    });
  }, [muminData, query, sector, gender, status, ageGroup, hasPhone, hasSabil]);

  function clearFilters() {
    setQuery(""); setSector(""); setGender(""); setStatus("");
    setAgeGroup(""); setHasPhone(""); setHasSabil("");
  }

  return (
    <div>
      <div className="page-hdr">
        <div className="page-title">Advanced Mumin Search</div>
        <div className="page-sub">Find members using multiple filters</div>
      </div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-hdr"><span className="card-title">Search & Filters</span><button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear All</button></div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "2fr repeat(3,1fr)", gap: 12 }}>
          <input placeholder="Name, ITS, phone, email, Sabil or address…" value={query} onChange={function (e) { setQuery(e.target.value); }} />
          <select value={sector} onChange={function (e) { setSector(e.target.value); }}><option value="">All Sectors</option>{areaSectors.map(function (s) { return <option key={s} value={s}>{s}</option>; })}</select>
          <select value={gender} onChange={function (e) { setGender(e.target.value); }}><option value="">All Genders</option><option value="Male">Male</option><option value="Female">Female</option></select>
          <select value={status} onChange={function (e) { setStatus(e.target.value); }}><option value="">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
          <select value={ageGroup} onChange={function (e) { setAgeGroup(e.target.value); }}><option value="">All Ages</option><option value="child">Children 0–15</option><option value="youth">Youth 16–30</option><option value="adult">Adults 31–60</option><option value="senior">Seniors 61+</option></select>
          <select value={hasPhone} onChange={function (e) { setHasPhone(e.target.value); }}><option value="">Phone: Any</option><option value="yes">Has Phone</option><option value="no">Missing Phone</option></select>
          <select value={hasSabil} onChange={function (e) { setHasSabil(e.target.value); }}><option value="">Sabil: Any</option><option value="yes">Assigned Sabil</option><option value="no">No Sabil</option></select>
        </div>
      </div>
      <div className="card">
        <div className="card-hdr"><span className="card-title">Results ({results.length})</span><span style={{ fontSize: 12, color: "#6b7280" }}>Click a member for Mumin 360</span></div>
        {results.length === 0 ? <div className="empty"><div className="empty-icon">🔎</div><div>No members match these filters</div></div> : (
          <div style={{ overflowX: "auto" }}><table><thead><tr><th>ITS</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Sabil</th><th>Sector</th><th>Status</th><th></th></tr></thead>
            <tbody>{results.map(function (m) { return <tr key={m.id} className="clickable-row" onClick={function () { setMuminPreview(m); }}>
              <td><span className="file-no">{m.its_number || "—"}</span></td><td style={{ fontWeight: 500 }}>{m.name}</td><td>{getMuminAge(m) || "—"}</td><td>{m.gender || "—"}</td><td>{m.phone || "—"}</td><td>{m.sabil_no || "—"}</td><td>{m.area_sector || "—"}</td><td><span className={"badge badge-" + (m.status || "").toLowerCase()}>{m.status || "—"}</span></td><td><button className="btn btn-ghost btn-sm" onClick={function (e) { e.stopPropagation(); setMuminPreview(m); }}>View</button></td>
            </tr>; })}</tbody></table></div>
        )}
      </div>
    </div>
  );
}
