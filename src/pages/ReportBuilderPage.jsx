import { useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { getMuminAge, toXLS } from "../lib/utils.js";

function v(m,key,sourceKey){var a=m&&m[key];if(a!==undefined&&a!==null&&String(a).trim()!=="")return a;var s=m&&m.source_data;return s&&s[sourceKey||key]!==undefined?s[sourceKey||key]:"";}
var STORAGE="husaini_saved_reports_v1";
function loadSaved(){try{return JSON.parse(window.localStorage.getItem(STORAGE)||"[]");}catch(e){return [];}}
export function ReportBuilderPage(){
  var ctx=useAppContext(),data=(ctx.muminData||[]).filter(function(m){return !m.deleted_at;});
  var [search,setSearch]=useState(""),[startAge,setStartAge]=useState(""),[endAge,setEndAge]=useState(""),[sector,setSector]=useState(""),[gender,setGender]=useState(""),[status,setStatus]=useState(""),[hofOnly,setHofOnly]=useState(false),[hasPhone,setHasPhone]=useState(false);
  var [saved,setSaved]=useState(function(){return loadSaved();}),[savedName,setSavedName]=useState("");
  var [template,setTemplate]=useState("detailed");
  var sectors=useMemo(function(){return Array.from(new Set(data.map(function(m){return String(m.area_sector||"").trim();}).filter(Boolean))).sort();},[data]);
  var rows=useMemo(function(){var q=search.trim().toLowerCase(),lo=startAge===""?null:Number(startAge),hi=endAge===""?null:Number(endAge);return data.filter(function(m){
    var age=getMuminAge(m),source=m.source_data||{},its=String(m.its_number||m.its_id||"").trim(),text=(its+" "+(m.name||"")+" "+(m.phone||"")).toLowerCase();
    if(q&&text.indexOf(q)<0)return false;if(lo!==null&&(age===null||age<lo))return false;if(hi!==null&&(age===null||age>hi))return false;
    if(sector&&m.area_sector!==sector)return false;if(gender&&m.gender!==gender)return false;if(status&&m.status!==status)return false;
    if((hofOnly||template==="hof")&&String(source.HOF_FM_TYPE||"").toUpperCase()!=="HOF")return false;if(hasPhone&&!String(m.phone||"").trim())return false;return true;
  });},[data,search,startAge,endAge,sector,gender,status,hofOnly,hasPhone,template]);
  function filters(){return {search:search,startAge:startAge,endAge:endAge,sector:sector,gender:gender,status:status,hofOnly:hofOnly,hasPhone:hasPhone,template:template};}
  function apply(f){setSearch(f.search||"");setStartAge(f.startAge||"");setEndAge(f.endAge||"");setSector(f.sector||"");setGender(f.gender||"");setStatus(f.status||"");setHofOnly(!!f.hofOnly);setHasPhone(!!f.hasPhone);setTemplate(f.template||"detailed");}
  function saveReport(){var name=savedName.trim();if(!name){alert("Enter a report name.");return;}var next=saved.filter(function(x){return x.name.toLowerCase()!==name.toLowerCase();});next.unshift({name:name,filters:filters(),updatedAt:new Date().toISOString()});next=next.slice(0,20);window.localStorage.setItem(STORAGE,JSON.stringify(next));setSaved(next);setSavedName("");}
  function removeReport(name){var next=saved.filter(function(x){return x.name!==name;});localStorage.setItem(STORAGE,JSON.stringify(next));setSaved(next);}
  function reset(){apply({});}
  function printReport(){window.print();}
  function exportExcel(){var out=rows.map(function(m){var source=m.source_data||{},hof=data.find(function(x){return String(x.its_number||x.its_id||"")===String(source.HOF_ID||"");});return {"ITS":m.its_number||m.its_id||"","Name":m.name||"","Age":getMuminAge(m)===null?"":getMuminAge(m),"Gender":m.gender||"","Phone":m.phone||"","Sector":m.area_sector||"","HOF ITS":source.HOF_ID||"","HOF Name":hof?hof.name:"","Status":m.status||""};});toXLS(out,["ITS","Name","Age","Gender","Phone","Sector","HOF ITS","HOF Name","Status"],"advanced_report");}
  return <div>
    <div className="page-hdr"><div className="page-title">Advanced Report Builder</div><div className="page-sub">Build, save and export filtered Mumin reports.</div></div>
    <div className="card"><div className="advanced-search-filters">
      <input className="input" placeholder="Search ITS or name" value={search} onChange={function(e){setSearch(e.target.value);}}/>
      <input className="input" type="number" min="0" placeholder="Start Age" value={startAge} onChange={function(e){setStartAge(e.target.value);}}/>
      <input className="input" type="number" min="0" placeholder="End Age" value={endAge} onChange={function(e){setEndAge(e.target.value);}}/>
      <select className="input" value={sector} onChange={function(e){setSector(e.target.value);}}><option value="">All Sectors</option>{sectors.map(function(s){return <option key={s}>{s}</option>;})}</select>
      <select className="input" value={gender} onChange={function(e){setGender(e.target.value);}}><option value="">All Gender</option><option>Male</option><option>Female</option></select>
      <select className="input" value={status} onChange={function(e){setStatus(e.target.value);}}><option value="">All Status</option><option>Active</option><option>Inactive</option></select>
    </div><div style={{display:"flex",gap:14,flexWrap:"wrap",marginTop:12}}>
      <label><input type="checkbox" checked={hofOnly} onChange={function(e){setHofOnly(e.target.checked);}}/> HOF only</label><label><input type="checkbox" checked={hasPhone} onChange={function(e){setHasPhone(e.target.checked);}}/> Has phone</label>
      <button className="btn btn-ghost btn-sm" onClick={reset}>Reset Filters</button><button className="btn btn-primary btn-sm" onClick={exportExcel}>📊 Export Excel ({rows.length})</button><button className="btn btn-gold btn-sm no-print" onClick={printReport}>🖨 Print Report</button>
    </div></div>
    <div className="card" style={{marginTop:16}}><div className="card-hdr"><span className="card-title">Printable Report Layout</span></div><div style={{padding:14,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}><label style={{display:"flex",gap:8,alignItems:"center"}}>Template <select className="input" value={template} onChange={function(e){setTemplate(e.target.value);}}><option value="detailed">Detailed Register</option><option value="compact">Compact Register</option><option value="hof">HOF Names Directory</option></select></label><span className="muted">Choose a layout, then use Print Report or your browser’s Save as PDF.</span></div></div>
    <div className="card" style={{marginTop:16}}><div className="card-hdr"><span className="card-title">Saved Reports</span><span style={{fontSize:11,color:"#6b7280"}}>{saved.length}/20</span></div>
      <div style={{padding:14,display:"flex",gap:8,flexWrap:"wrap"}}><input className="input" style={{maxWidth:320}} placeholder="Report name, e.g. Seniors - Sector A" value={savedName} onChange={function(e){setSavedName(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")saveReport();}}/><button className="btn btn-gold btn-sm" onClick={saveReport}>Save Current Report</button></div>
      {saved.length>0&&<div style={{padding:"0 14px 14px",display:"flex",gap:8,flexWrap:"wrap"}}>{saved.map(function(r){return <div key={r.name} style={{display:"flex",alignItems:"center",gap:6,border:"1px solid rgba(255,255,255,.08)",borderRadius:8,padding:"7px 9px"}}><button className="btn btn-ghost btn-sm" onClick={function(){apply(r.filters);}}>{r.name}</button><button className="btn btn-ghost btn-sm" title="Delete saved report" onClick={function(){removeReport(r.name);}}>×</button></div>;})}</div>}
    </div>
    <div className="card" style={{marginTop:16}}><div className="card-hdr"><span className="card-title">{template==="hof"?"HOF Names Directory":"Results"} ({rows.length})</span></div><div className="print-header" style={{padding:"14px 0"}}><h2 style={{margin:"0 0 4px"}}>Husaini Mohallah Database</h2><p style={{margin:0}}>{template==="hof"?"HOF Names Directory":template==="compact"?"Compact Mumin Register":"Detailed Mumin Register"} · {rows.length} records</p></div><div style={{overflowX:"auto"}}><table><thead><tr><th>ITS</th><th>Name</th>{template!=="compact"&&<th>Age</th>}{template!=="hof"&&<th>Gender</th>}<th>Sector</th>{template!=="compact"&&<th>HOF ITS</th>}{template!=="compact"&&<th>HOF Name</th>}{template==="detailed"&&<th>Phone</th>}</tr></thead><tbody>{rows.map(function(m){var source=m.source_data||{},hof=data.find(function(x){return String(x.its_number||x.its_id||"")===String(source.HOF_ID||"");});return <tr key={m.id}><td>{m.its_number||m.its_id||"—"}</td><td>{m.name||"—"}</td>{template!=="compact"&&<td>{getMuminAge(m)===null?"—":getMuminAge(m)}</td>}{template!=="hof"&&<td>{m.gender||"—"}</td>}<td>{m.area_sector||"—"}</td>{template!=="compact"&&<td>{source.HOF_ID||"—"}</td>}{template!=="compact"&&<td>{hof?hof.name:"—"}</td>}{template==="detailed"&&<td>{m.phone||"—"}</td>}</tr>;})}</tbody></table></div><div className="muted no-print" style={{padding:12}}>Showing all {rows.length} filtered results. Use Print Report for the selected layout.</div></div>
  </div>;
}
