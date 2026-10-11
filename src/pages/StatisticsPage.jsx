import { useMemo } from "react";
import { useAppContext } from "../context/AppContext.jsx";
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
export function StatisticsPage() {
  var ctx = useAppContext(), data = ctx.muminData || [], sectors = ctx.areaSectors || [];
  var stats = useMemo(function() {
    var ages = data.filter(function(m){return getMuminAge(m)!==null;});
    var active = data.filter(function(m){return !m.status || String(m.status).toLowerCase()==="active";}).length;
    var phone = data.filter(function(m){return String(m.phone||"").trim();}).length;
    var verified = data.filter(function(m){var v=field(m,"data_verification_status","Data_Verifcation_Status").toLowerCase();return v.indexOf("verified")>=0&&v.indexOf("not")<0;}).length;
    var fam={}; data.forEach(function(m){var s=String(m.sabil_no||"").trim();if(s)fam[s]=1;});
    var hof=data.filter(function(m){var e=src(m), h=String(e.HOF_ID||m.HOF_ID||e.hof_id||m.hof_id||"").trim(); return h && h===String(m.its_id||m.its_number||"").trim();}).length;
    return {active:active, inactive:data.length-active, phone:phone, verified:verified, families:Object.keys(fam).length, hof:hof, ageKnown:ages.length, avgAge:ages.length?ages.reduce(function(s,m){return s+getMuminAge(m);},0)/ages.length:0};
  },[data]);
  var age = useMemo(function(){return [{key:"Children (0–15)",min:0,max:15},{key:"Youth (16–30)",min:16,max:30},{key:"Adults (31–60)",min:31,max:60},{key:"Seniors (61+)",min:61,max:999}].map(function(g){return {key:g.key,count:data.filter(function(m){var a=getMuminAge(m);return a!==null&&a>=g.min&&a<=g.max;}).length};});},[data]);
  var gender=useMemo(function(){return groups(data,function(m){return m.gender;});},[data]);
  var status=useMemo(function(){return groups(data,function(m){return m.status||"Active";});},[data]);
  var sector=useMemo(function(){return groups(data,function(m){return m.area_sector;});},[data]);
  var city=useMemo(function(){return groups(data,function(m){return field(m,"city","City");});},[data]);
  var marital=useMemo(function(){return groups(data,function(m){return field(m,"marital_status","Marital_Status");});},[data]);
  var blood=useMemo(function(){return groups(data,function(m){return field(m,"blood_group","Blood_Group");});},[data]);
  function exportStats(){toXLS([{metric:"Total Mumineen",value:data.length},{metric:"Active Members",value:stats.active},{metric:"Inactive / Other",value:stats.inactive},{metric:"HOF Records",value:stats.hof},{metric:"Family / Sabil Groups",value:stats.families},{metric:"Average Age",value:stats.avgAge.toFixed(1)},{metric:"Members With Phone",value:stats.phone},{metric:"Members Missing Phone",value:data.length-stats.phone},{metric:"Verified Data",value:stats.verified},{metric:"Not Fully Verified",value:data.length-stats.verified}],["metric","value"],"Statistics");}
  var coverage=[["Phone",stats.phone,data.length-stats.phone],["Age / DOB",stats.ageKnown,data.length-stats.ageKnown],["Verified Data",stats.verified,data.length-stats.verified]];
  return <div>
    <div className="page-hdr"><div><div className="page-title">Dashboard & Statistics</div><div className="page-sub">Live demographic and data-quality statistics</div></div><button className="btn btn-gold" onClick={exportStats}>📊 Export Statistics</button></div>
    <div className="stats-grid">{[
      ["Total Mumineen",data.length,"Registered members"],["Active Members",stats.active,stats.inactive+" inactive / other"],["HOF Records",stats.hof,"Household heads identified"],["Family / Sabil Groups",stats.families,"Unique Sabil groups"],["Average Age",stats.avgAge.toFixed(1),stats.ageKnown+" members with age"],["Phone Coverage",data.length?(stats.phone/data.length*100).toFixed(1)+"%":"0%",(data.length-stats.phone)+" missing phone"],["Data Verification",data.length?(stats.verified/data.length*100).toFixed(1)+"%":"0%",(data.length-stats.verified)+" not fully verified"]
    ].map(function(s){return <div className="stat-card" key={s[0]}><div className="stat-lbl">{s[0]}</div><div className="stat-val">{s[1]}</div><div className="stat-desc">{s[2]}</div></div>;})}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:18,marginTop:20}}>
      <Chart title="Age Distribution" rows={age} total={data.length}/><Chart title="Gender Distribution" rows={gender} total={data.length}/>
      <Chart title="Member Status" rows={status} total={data.length}/><Chart title="Members by Area Sector" rows={sector} total={data.length} limit={12}/>
      <Chart title="City Distribution" rows={city} total={data.length} limit={10}/><Chart title="Marital Status" rows={marital} total={data.length}/>
      <Chart title="Blood Group" rows={blood} total={data.length}/>
      <div className="card"><div className="card-hdr"><span className="card-title">Database Coverage</span></div><div style={{padding:20}}>{coverage.map(function(r){var p=data.length?r[1]/data.length*100:0;return <div key={r[0]} style={{marginBottom:18}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}><span>{r[0]}</span><strong>{p.toFixed(1)}%</strong></div><div style={{height:9,background:"rgba(255,255,255,.06)",borderRadius:6}}><div style={{width:p+"%",height:"100%",background:"#c9a84c",borderRadius:6}} /></div><div style={{fontSize:10,color:"#6b7280",marginTop:4}}>{r[1]} complete · {r[2]} missing</div></div>;})}<div style={{fontSize:11,color:"#6b7280"}}>Configured area sectors: {sectors.length}</div></div></div>
    </div>
  </div>;
}
