import { useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { getMuminAge, toXLS } from "../lib/utils.js";

function v(m, key, sourceKey) {
  var a = m && m[key];
  if (a !== undefined && a !== null && String(a).trim() !== "") return a;
  var s = m && m.source_data;
  return s && s[sourceKey || key] !== undefined ? s[sourceKey || key] : "";
}

export function ReportBuilderPage() {
  var ctx = useAppContext();
  var data = (ctx.muminData || []).filter(function (m) { return !m.deleted_at; });
  var [search, setSearch] = useState("");
  var [startAge, setStartAge] = useState("");
  var [endAge, setEndAge] = useState("");
  var [sector, setSector] = useState("");
  var [gender, setGender] = useState("");
  var [status, setStatus] = useState("");
  var [hofOnly, setHofOnly] = useState(false);
  var [hasPhone, setHasPhone] = useState(false);

  var sectors = useMemo(function () {
    return Array.from(new Set(data.map(function (m) { return String(m.area_sector || "").trim(); }).filter(Boolean))).sort();
  }, [data]);

  var rows = useMemo(function () {
    var q = search.trim().toLowerCase();
    var lo = startAge === "" ? null : Number(startAge);
    var hi = endAge === "" ? null : Number(endAge);
    return data.filter(function (m) {
      var age = getMuminAge(m);
      var source = m.source_data || {};
      var its = String(m.its_number || m.its_id || "").trim();
      var text = (its + " " + (m.name || "") + " " + (m.phone || "")).toLowerCase();
      if (q && text.indexOf(q) < 0) return false;
      if (lo !== null && (age === null || age < lo)) return false;
      if (hi !== null && (age === null || age > hi)) return false;
      if (sector && m.area_sector !== sector) return false;
      if (gender && m.gender !== gender) return false;
      if (status && m.status !== status) return false;
      if (hofOnly && String(source.HOF_FM_TYPE || "").toUpperCase() !== "HOF") return false;
      if (hasPhone && !String(m.phone || "").trim()) return false;
      return true;
    });
  }, [data, search, startAge, endAge, sector, gender, status, hofOnly, hasPhone]);

  function reset() {
    setSearch(""); setStartAge(""); setEndAge(""); setSector(""); setGender(""); setStatus(""); setHofOnly(false); setHasPhone(false);
  }

  function exportExcel() {
    var out = rows.map(function (m) {
      var source = m.source_data || {};
      return {
        "ITS": m.its_number || m.its_id || "",
        "Name": m.name || "",
        "Age": getMuminAge(m) === null ? "" : getMuminAge(m),
        "Gender": m.gender || "",
        "Phone": m.phone || "",
        "Sector": m.area_sector || "",
        "HOF ITS": source.HOF_ID || "",
        "HOF Name": (data.find(function (x) { return String(x.its_number || x.its_id || "") === String(source.HOF_ID || ""); }) || {}).name || "",
        "Status": m.status || ""
      };
    });
    toXLS(out, ["ITS","Name","Age","Gender","Phone","Sector","HOF ITS","HOF Name","Status"], "advanced_report");
  }

  return <div>
    <div className="page-hdr">
      <div className="page-title">Advanced Report Builder</div>
      <div className="page-sub">Build a filtered Mumin report with an age range and export it to Excel.</div>
    </div>
    <div className="card">
      <div className="advanced-search-filters">
        <input className="input" placeholder="Search ITS or name" value={search} onChange={function(e){setSearch(e.target.value);}} />
        <input className="input" type="number" min="0" placeholder="Start Age" value={startAge} onChange={function(e){setStartAge(e.target.value);}} />
        <input className="input" type="number" min="0" placeholder="End Age" value={endAge} onChange={function(e){setEndAge(e.target.value);}} />
        <select className="input" value={sector} onChange={function(e){setSector(e.target.value);}}><option value="">All Sectors</option>{sectors.map(function(s){return <option key={s}>{s}</option>;})}</select>
        <select className="input" value={gender} onChange={function(e){setGender(e.target.value);}}><option value="">All Gender</option><option>Male</option><option>Female</option></select>
        <select className="input" value={status} onChange={function(e){setStatus(e.target.value);}}><option value="">All Status</option><option>Active</option><option>Inactive</option></select>
      </div>
      <div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:12}}>
        <label><input type="checkbox" checked={hofOnly} onChange={function(e){setHofOnly(e.target.checked);}} /> HOF only</label>
        <label><input type="checkbox" checked={hasPhone} onChange={function(e){setHasPhone(e.target.checked);}} /> Has phone</label>
        <button className="btn btn-ghost btn-sm" onClick={reset}>Reset Filters</button>
        <button className="btn btn-primary btn-sm" onClick={exportExcel}>📊 Export Excel ({rows.length})</button>
      </div>
    </div>
    <div className="card" style={{marginTop:16}}>
      <div className="card-hdr"><span className="card-title">Results ({rows.length})</span></div>
      <div style={{overflowX:"auto"}}>
        <table><thead><tr><th>ITS</th><th>Name</th><th>Age</th><th>Gender</th><th>Sector</th><th>HOF ITS</th><th>HOF Name</th><th>Phone</th></tr></thead>
        <tbody>{rows.slice(0,1000).map(function(m){var source=m.source_data||{};var hof=data.find(function(x){return String(x.its_number||x.its_id||"")===String(source.HOF_ID||"");});return <tr key={m.id}><td>{m.its_number||m.its_id||"—"}</td><td>{m.name||"—"}</td><td>{getMuminAge(m)===null?"—":getMuminAge(m)}</td><td>{m.gender||"—"}</td><td>{m.area_sector||"—"}</td><td>{source.HOF_ID||"—"}</td><td>{hof?hof.name:"—"}</td><td>{m.phone||"—"}</td></tr>;})}</tbody></table>
      </div>
      {rows.length>1000 && <div className="muted" style={{padding:12}}>Showing first 1,000 rows. Excel export includes all {rows.length} results.</div>}
    </div>
  </div>;
}
