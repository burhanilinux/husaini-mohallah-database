import { useMemo } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import { DashboardSearch } from "../components/DashboardSearch.jsx";
import { getMuminAge, toXLS } from "../lib/utils.js";

function src(m) { return m.source_data || {}; }
function field(m, key, legacy) { return String(m[key] ?? src(m)[legacy] ?? "").trim(); }
function groups(data, fn) {
  var map = {};
  data.forEach(function(m) { var k = fn(m) || "Not Specified"; map[k] = (map[k] || 0) + 1; });
  return Object.keys(map).map(function(k) { return { key:k, count:map[k] }; })
    .sort(function(a,b) { return b.count-a.count || a.key.localeCompare(b.key); });
}
function Chart({ title, rows, total, limit }) {
  var shown = limit ? rows.slice(0, limit) : rows;
  return <div className="card" style={{height:"100%"}}>
    <div className="card-hdr"><span className="card-title">{title}</span><span style={{fontSize:11,color:"#6b7280"}}>{rows.length} groups</span></div>
    <div style={{padding:18}}>
      {shown.length ? shown.map(function(r) {
        var pct = total ? r.count / total * 100 : 0;
        return <div key={r.key} style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}><span>{r.key}</span><strong style={{color:"#c9a84c"}}>{r.count}</strong></div>
          <div style={{height:7,borderRadius:5,background:"rgba(255,255,255,.06)"}}><div style={{width:pct+"%",height:"100%",background:"#c9a84c",borderRadius:5}} /></div>
          <div style={{fontSize:10,color:"#6b7280",marginTop:3}}>{pct.toFixed(1)}%</div>
        </div>;
      }) : <div style={{fontSize:12,color:"#6b7280"}}>No data available.</div>}
      {limit && rows.length > limit && <div style={{fontSize:11,color:"#6b7280"}}>Showing top {limit}</div>}
    </div>
  </div>;
}

export function Dashboard() {
  var ctx = useAppContext();
  var muminData = ctx.muminData || [], filesData = ctx.filesData || [], attsData = ctx.attsData || [];
  var loading = ctx.loading, setSelSector = ctx.setSelSector, setPage = ctx.setPage;
  var areaSectors = ctx.areaSectors || [];
  var active = muminData.filter(function(m) { return !m.status || String(m.status).toLowerCase() === "active"; }).length;
  var missingPhone = muminData.filter(function(m) { return !String(m.phone || "").trim(); }).length;
  var families = {};
  muminData.forEach(function(m) { var s=String(m.sabil_no || "").trim(); if(s) families[s]=1; });
  var ageGroups = useMemo(function() {
    return [{label:"Children",range:"0–15",min:0,max:15},{label:"Youth",range:"16–30",min:16,max:30},{label:"Adults",range:"31–60",min:31,max:60},{label:"Seniors",range:"61+",min:61,max:999}]
      .map(function(g) { return {key:g.label+" ("+g.range+")",count:muminData.filter(function(m){var a=getMuminAge(m);return a!==null&&a>=g.min&&a<=g.max;}).length}; });
  }, [muminData]);
  var gender = useMemo(function(){return groups(muminData,function(m){return m.gender;});},[muminData]);
  var status = useMemo(function(){return groups(muminData,function(m){return m.status || "Active";});},[muminData]);
  var sector = useMemo(function(){return groups(muminData,function(m){return m.area_sector;});},[muminData]);
  var city = useMemo(function(){return groups(muminData,function(m){return field(m,"city","City");});},[muminData]);
  var marital = useMemo(function(){return groups(muminData,function(m){return field(m,"marital_status","Marital_Status");});},[muminData]);
  var blood = useMemo(function(){return groups(muminData,function(m){return field(m,"blood_group","Blood_Group");});},[muminData]);
  var stats = useMemo(function() {
    var ageKnown=muminData.filter(function(m){return getMuminAge(m)!==null;});
    var phone=muminData.filter(function(m){return String(m.phone||"").trim();}).length;
    var verified=muminData.filter(function(m){var v=field(m,"data_verification_status","Data_Verifcation_Status").toLowerCase();return v.indexOf("verified")>=0&&v.indexOf("not")<0;}).length;
    var hof=muminData.filter(function(m){var e=src(m),h=String(e.HOF_ID||m.HOF_ID||e.hof_id||m.hof_id||"").trim();return h&&h===String(m.its_id||m.its_number||"").trim();}).length;
    return {phone:phone,verified:verified,hof:hof,ageKnown:ageKnown.length,avgAge:ageKnown.length?ageKnown.reduce(function(s,m){return s+getMuminAge(m);},0)/ageKnown.length:0};
  },[muminData]);
  function exportStats() {
    toXLS([{metric:"Total Mumineen",value:muminData.length},{metric:"Active Members",value:active},{metric:"Inactive / Other",value:muminData.length-active},{metric:"HOF Records",value:stats.hof},{metric:"Family / Sabil Groups",value:Object.keys(families).length},{metric:"Average Age",value:stats.avgAge.toFixed(1)},{metric:"Members With Phone",value:stats.phone},{metric:"Members Missing Phone",value:muminData.length-stats.phone},{metric:"Verified Data",value:stats.verified},{metric:"Not Fully Verified",value:muminData.length-stats.verified}],[ "metric","value" ],"Mohallah-Dashboard-Statistics");
  }
  var coverage=[["Phone",stats.phone,muminData.length-stats.phone],["Age / DOB",stats.ageKnown,muminData.length-stats.ageKnown],["Verified Data",stats.verified,muminData.length-stats.verified]];
  return <div>
    <div className="page-hdr" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
      <div><div className="page-title">Husaini Mohallah Dashboard</div><div className="page-sub">One unified overview of member records, demographics, and data quality · Live data from Supabase</div></div>
      <button className="btn btn-gold" onClick={exportStats}>📊 Export Statistics</button>
    </div>
    <DashboardSearch />
    {loading ? <div className="loading"><Spinner /> Loading…</div> : <div>
      <div className="stats-grid">
        {[
          {label:"Total Mumineen",value:muminData.length,desc:"Registered members"},
          {label:"Active Members",value:active,desc:"Current active records"},
          {label:"Families / Sabil",value:Object.keys(families).length,desc:"Unique family groups"},
          {label:"Household Heads",value:stats.hof,desc:"HOF records identified"},
          {label:"Missing Phone",value:missingPhone,desc:"Needs data attention"},
          {label:"Phone Coverage",value:(muminData.length?(stats.phone/muminData.length*100).toFixed(1):"0")+"%",desc:missingPhone+" members missing phone"},
          {label:"Total Files",value:filesData.length,desc:"All years combined"},
          {label:"Attachments",value:attsData.length,desc:"Scans and photos"}
        ].map(function(s){return <div className="stat-card" key={s.label}><div className="stat-lbl">{s.label}</div><div className="stat-val">{s.value}</div><div className="stat-desc">{s.desc}</div></div>;})}
      </div>
      <div className="card" style={{marginTop:8}}>
        <div className="card-hdr"><span className="card-title">Age Demographics</span><span style={{fontSize:12,color:"#6b7280"}}>{muminData.length} total members</span></div>
        <div style={{padding:20,display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
          {ageGroups.map(function(g){var pct=muminData.length?(g.count/muminData.length*100).toFixed(1):"0.0";return <div key={g.key} className="umoor-card"><div className="umoor-name">{g.key}</div><div style={{fontSize:24,fontWeight:700,color:"#e2d9c9",marginTop:8}}>{g.count}</div><div style={{fontSize:11,color:"#6b7280"}}>{pct}% of members</div></div>;})}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:18,marginTop:20}}>
        <Chart title="Gender Distribution" rows={gender} total={muminData.length}/>
        <Chart title="Member Status" rows={status} total={muminData.length}/>
        <Chart title="Members by Area Sector" rows={sector} total={muminData.length} limit={12}/>
        <Chart title="City Distribution" rows={city} total={muminData.length} limit={10}/>
        <Chart title="Marital Status" rows={marital} total={muminData.length}/>
        <Chart title="Blood Group" rows={blood} total={muminData.length}/>
        <div className="card"><div className="card-hdr"><span className="card-title">Database Coverage</span></div><div style={{padding:20}}>{coverage.map(function(r){var p=muminData.length?r[1]/muminData.length*100:0;return <div key={r[0]} style={{marginBottom:18}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}><span>{r[0]}</span><strong>{p.toFixed(1)}%</strong></div><div style={{height:9,background:"rgba(255,255,255,.06)",borderRadius:6}}><div style={{width:p+"%",height:"100%",background:"#c9a84c",borderRadius:6}} /></div><div style={{fontSize:10,color:"#6b7280",marginTop:4}}>{r[1]} complete · {r[2]} missing</div></div>;})}<div style={{fontSize:11,color:"#6b7280"}}>Configured area sectors: {areaSectors.length} · Average age: {stats.avgAge.toFixed(1)} years · Verified records: {stats.verified}</div></div></div>
      </div>
      {areaSectors.length>0&&<div className="card" style={{marginTop:20}}><div className="card-hdr"><span className="card-title">Quick Access · Members by Area Sector</span><span style={{fontSize:12,color:"#6b7280"}}>{muminData.length} total members</span></div><div style={{padding:20}}><div className="umoor-grid">{areaSectors.map(function(s){var count=muminData.filter(function(m){return m.area_sector===s;}).length;return <div key={s} className="umoor-card" onClick={function(){setSelSector(s);setPage("mumin");}}><div className="umoor-name">{s}</div><div className="umoor-count">{count} member{count!==1?"s":""} · Click to view</div></div>;})}</div></div></div>}
    </div>}
  </div>;
}
