import { useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { getMuminAge, toXLS } from "../lib/utils.js";

var STORAGE="husaini_saved_reports_v1";
var REPORT_COLUMNS=[
  {key:"its",label:"ITS"},{key:"name",label:"Name"},{key:"age",label:"Age"},{key:"gender",label:"Gender"},
  {key:"sector",label:"Sector"},{key:"hofIts",label:"HOF ITS"},{key:"hofName",label:"HOF Name"},{key:"phone",label:"Phone"},{key:"status",label:"Status"}
];
var DEFAULT_COLUMNS=["its","name","age","gender","sector","hofIts","hofName","phone","status"];
function rowValue(m,key,data){
  var source=m.source_data||{},hofKey=source.HOF_ID||source.hof_id||m.HOF_ID||m.hof_id||"",hof=data.find(function(x){return String(x.its_number||x.its_id||"")===String(hofKey);});
  if(key==="its")return m.its_number||m.its_id||"";
  if(key==="name")return m.name||"";
  if(key==="age"){var age=getMuminAge(m);return age===null?"":age;}
  if(key==="gender")return m.gender||"";
  if(key==="sector")return m.area_sector||"";
  if(key==="hofIts")return hofKey;
  if(key==="hofName")return hof?hof.name:"";
  if(key==="phone")return m.phone||"";
  if(key==="status")return m.status||"";
  return "";
}
function normalizeColumns(value){var allowed=REPORT_COLUMNS.map(function(x){return x.key;});var list=Array.isArray(value)?value.filter(function(x){return allowed.indexOf(x)>=0;}):[];return list.length?list:DEFAULT_COLUMNS.slice();}
function loadSaved(){try{return JSON.parse(window.localStorage.getItem(STORAGE)||"[]");}catch(e){return [];}}
export function ReportBuilderPage(){
  var ctx=useAppContext(),data=(ctx.muminData||[]).filter(function(m){return !m.deleted_at;});
  var [search,setSearch]=useState(""),[startAge,setStartAge]=useState(""),[endAge,setEndAge]=useState(""),[sector,setSector]=useState(""),[gender,setGender]=useState(""),[status,setStatus]=useState(""),[hofOnly,setHofOnly]=useState(false),[hasPhone,setHasPhone]=useState(false);
  var [saved,setSaved]=useState(function(){return loadSaved();}),[savedName,setSavedName]=useState("");
  var [template,setTemplate]=useState("detailed");
  var [columns,setColumns]=useState(DEFAULT_COLUMNS.slice());
  var [columnError,setColumnError]=useState("");
  var sectors=useMemo(function(){return Array.from(new Set(data.map(function(m){return String(m.area_sector||"").trim();}).filter(Boolean))).sort();},[data]);
  var rows=useMemo(function(){var q=search.trim().toLowerCase(),lo=startAge===""?null:Number(startAge),hi=endAge===""?null:Number(endAge);return data.filter(function(m){
    var age=getMuminAge(m),source=m.source_data||{},its=String(m.its_number||m.its_id||"").trim(),hofIts=String(source.HOF_ID||source.hof_id||m.HOF_ID||m.hof_id||"").trim(),text=(its+" "+(m.name||"")+" "+(m.phone||"")+" "+hofIts).toLowerCase();
    if(q&&text.indexOf(q)<0)return false;if(lo!==null&&(age===null||age<lo))return false;if(hi!==null&&(age===null||age>hi))return false;
    if(sector&&m.area_sector!==sector)return false;if(gender&&m.gender!==gender)return false;if(status&&m.status!==status)return false;
    if(hofOnly||template==="hof"){var type=String(source.HOF_FM_TYPE||source.hof_fm_type||m.HOF_FM_TYPE||m.hof_fm_type||"").toUpperCase();if(type!=="HOF"&&!String(hofIts).trim())return false;}if(hasPhone&&!String(m.phone||"").trim())return false;return true;
  });},[data,search,startAge,endAge,sector,gender,status,hofOnly,hasPhone,template]);
  function filters(){return {search:search,startAge:startAge,endAge:endAge,sector:sector,gender:gender,status:status,hofOnly:hofOnly,hasPhone:hasPhone,template:template,columns:columns};}
  function apply(f){setSearch(f.search||"");setStartAge(f.startAge||"");setEndAge(f.endAge||"");setSector(f.sector||"");setGender(f.gender||"");setStatus(f.status||"");setHofOnly(!!f.hofOnly);setHasPhone(!!f.hasPhone);setTemplate(f.template||"detailed");setColumns(normalizeColumns(f.columns));}
  function saveReport(){var name=savedName.trim();if(!name){alert("Enter a report name.");return;}var next=saved.filter(function(x){return x.name.toLowerCase()!==name.toLowerCase();});next.unshift({name:name,filters:filters(),updatedAt:new Date().toISOString()});next=next.slice(0,20);window.localStorage.setItem(STORAGE,JSON.stringify(next));setSaved(next);setSavedName("");}
  function removeReport(name){var next=saved.filter(function(x){return x.name!==name;});window.localStorage.setItem(STORAGE,JSON.stringify(next));setSaved(next);}
  function reset(){apply({});}
  function printReport(){window.print();}
  function exportExcel(){var out=rows.map(function(m){var item={};columns.forEach(function(key){var col=REPORT_COLUMNS.find(function(x){return x.key===key;});if(col)item[col.label]=rowValue(m,key,data);});return item;});var headers=columns.map(function(key){var col=REPORT_COLUMNS.find(function(x){return x.key===key;});return col?col.label:key;});toXLS(out,headers,"advanced_report");}
  function toggleColumn(key){setColumnError("");setColumns(function(prev){if(prev.indexOf(key)>=0){if(prev.length===1){setColumnError("Select at least one column.");return prev;}return prev.filter(function(x){return x!==key;});}return prev.concat(key);});}
  function moveColumn(key,direction){setColumns(function(prev){var i=prev.indexOf(key),j=i+direction;if(i<0||j<0||j>=prev.length)return prev;var next=prev.slice(),tmp=next[i];next[i]=next[j];next[j]=tmp;return next;});}
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
    <div className="card" style={{marginTop:16}}><div className="card-hdr"><span className="card-title">Custom Report Columns</span><span style={{fontSize:11,color:"#6b7280"}}>{columns.length} selected</span></div><div style={{padding:14}}><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{REPORT_COLUMNS.map(function(col){var selected=columns.indexOf(col.key)>=0;return <label key={col.key} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 8px",border:"1px solid rgba(255,255,255,.08)",borderRadius:8}}><input type="checkbox" checked={selected} onChange={function(){toggleColumn(col.key);}}/>{col.label}</label>;})}</div>{columnError&&<div style={{color:"#b91c1c",fontSize:12,marginTop:8}}>{columnError}</div>}<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>{columns.map(function(key,i){var col=REPORT_COLUMNS.find(function(x){return x.key===key;});return <span key={key} style={{display:"inline-flex",alignItems:"center",gap:4}}><button className="btn btn-ghost btn-sm" onClick={function(){moveColumn(key,-1);}} disabled={i===0}>←</button><span className="muted">{col?col.label:key}</span><button className="btn btn-ghost btn-sm" onClick={function(){moveColumn(key,1);}} disabled={i===columns.length-1}>→</button></span>;})}</div><div className="muted" style={{marginTop:8}}>Select the fields and order you want in the screen, Excel export and printed report.</div></div></div>
    <div className="card" style={{marginTop:16}}><div className="card-hdr"><span className="card-title">{template==="hof"?"HOF Names Directory":"Results"} ({rows.length})</span></div><div className="print-header" style={{padding:"14px 0"}}><h2 style={{margin:"0 0 4px"}}>Husaini Mohallah Database</h2><p style={{margin:0}}>{template==="hof"?"HOF Names Directory":template==="compact"?"Compact Mumin Register":"Detailed Mumin Register"} · {rows.length} records</p></div><div style={{overflowX:"auto"}}><table><thead><tr>{columns.map(function(key){var col=REPORT_COLUMNS.find(function(x){return x.key===key;});return <th key={key}>{col?col.label:key}</th>;})}</tr></thead><tbody>{rows.map(function(m){return <tr key={m.id}>{columns.map(function(key){var value=rowValue(m,key,data);return <td key={key}>{value===""||value===null?"—":value}</td>;})}</tr>;})}</tbody></table></div><div className="muted no-print" style={{padding:12}}>Showing all {rows.length} filtered results. Use Print Report for the selected layout.</div></div>
  </div>;
}
