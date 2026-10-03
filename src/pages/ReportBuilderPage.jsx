import { useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { getMuminAge, toXLS } from "../lib/utils.js";

var STORAGE="husaini_saved_reports_v1";
var FIELD_OPTIONS=[
  {key:"its",label:"ITS ID",aliases:["its_number","its_id","itsid"]},
  {key:"hofFmType",label:"HOF FM TYPE",aliases:["HOF_FM_TYPE","hof_fm_type"]},
  {key:"hofId",label:"HOF ID",aliases:["HOF_ID","hof_id"]},
  {key:"familyId",label:"Family ID",aliases:["family_id","familyid"]},
  {key:"fatherItsId",label:"Father ITS ID",aliases:["father_its_id","fatheritsid"]},
  {key:"motherItsId",label:"Mother ITS ID",aliases:["mother_its_id","motheritsid"]},
  {key:"spouseItsId",label:"Spouse ITS ID",aliases:["spouse_its_id","spouseitsid"]},
  {key:"tanzeemFileNo",label:"TanzeemFile No",aliases:["tanzeem_file_no","tanzeemfileno","tanzeem_file"]},
  {key:"name",label:"Full Name",aliases:["name","full_name","fullname"]},
  {key:"fullNameArabic",label:"Full Name Arabic",aliases:["full_name_arabic","fullnamearabic","name_arabic"]},
  {key:"firstPrefix",label:"First Prefix",aliases:["first_prefix","firstprefix"]},
  {key:"prefixYear",label:"Prefix Year",aliases:["prefix_year","prefixyear"]},
  {key:"firstName",label:"First Name",aliases:["first_name","firstname"]},
  {key:"fatherPrefix",label:"Father Prefix",aliases:["father_prefix","fatherprefix"]},
  {key:"fatherName",label:"Father Name",aliases:["father_name","fathername"]},
  {key:"fatherSurname",label:"Father Surname",aliases:["father_surname","fathersurname"]},
  {key:"husbandPrefix",label:"Husband Prefix",aliases:["husband_prefix","husbandprefix"]},
  {key:"husbandName",label:"Husband Name",aliases:["husband_name","husbandname"]},
  {key:"surname",label:"Surname",aliases:["surname","last_name","lastname"]},
  {key:"age",label:"Age",aliases:["age"]},
  {key:"hijriAge",label:"Hijri Age",aliases:["hijri_age","hijriage"]},
  {key:"gender",label:"Gender",aliases:["gender"]},
  {key:"misaq",label:"Misaq",aliases:["misaq"]},
  {key:"maritalStatus",label:"Marital Status",aliases:["marital_status","maritalstatus"]},
  {key:"bloodGroup",label:"Blood Group",aliases:["blood_group","bloodgroup"]},
  {key:"warakatulTarkhis",label:"Warakatul Tarkhis",aliases:["warakatul_tarkhis","warakatultarkhis"]},
  {key:"dateOfNikah",label:"Date Of Nikah",aliases:["date_of_nikah","dateofnikah","nikah_date"]},
  {key:"dateOfNikahHijri",label:"Date Of Nikah Hijri",aliases:["date_of_nikah_hijri","dateofnikahhijri"]},
  {key:"mobile",label:"Mobile",aliases:["mobile","phone"]},
  {key:"email",label:"Email",aliases:["email"]},
  {key:"whatsappNo",label:"WhatsApp No",aliases:["whatsapp_no","whatsappno","whatsapp"]},
  {key:"title",label:"Title",aliases:["title"]},
  {key:"category",label:"Category",aliases:["category"]},
  {key:"idara",label:"Idara",aliases:["idara"]},
  {key:"organisation",label:"Organisation",aliases:["organisation","organization"]},
  {key:"organisationCsv",label:"Organisation CSV",aliases:["organisation_csv","organization_csv"]},
  {key:"vatan",label:"Vatan",aliases:["vatan"]},
  {key:"nationality",label:"Nationality",aliases:["nationality"]},
  {key:"jamaat",label:"Jamaat",aliases:["jamaat"]},
  {key:"qualification",label:"Qualification",aliases:["qualification"]},
  {key:"languages",label:"Languages",aliases:["languages","language"]},
  {key:"hunars",label:"Hunars",aliases:["hunars","skills"]},
  {key:"occupation",label:"Occupation",aliases:["occupation"]},
  {key:"subOccupation",label:"Sub Occupation",aliases:["sub_occupation","suboccupation"]},
  {key:"subOccupation2",label:"Sub Occupation2",aliases:["sub_occupation2","suboccupation2"]},
  {key:"quranSanad",label:"Quran Sanad",aliases:["quran_sanad","quransanad"]},
  {key:"qadambosiSharaf",label:"Qadambosi Sharaf",aliases:["qadambosi_sharaf","qadambosisharaf"]},
  {key:"raudatTaheraZiyarat",label:"Raudat Tahera Ziyarat",aliases:["raudat_tahera_ziyarat","raudattaheraziyarat"]},
  {key:"karbalaZiyarat",label:"Karbala Ziyarat",aliases:["karbala_ziyarat","karbalaziyarat"]},
  {key:"asharaMubaraka",label:"Ashara Mubaraka",aliases:["ashara_mubaraka","asharamubaraka"]},
  {key:"housing",label:"Housing",aliases:["housing"]},
  {key:"typeOfHouse",label:"Type of House",aliases:["type_of_house","typeofhouse"]},
  {key:"address",label:"Address",aliases:["address"]},
  {key:"building",label:"Building",aliases:["building"]},
  {key:"street",label:"Street",aliases:["street"]},
  {key:"area",label:"Area",aliases:["area"]},
  {key:"state",label:"State",aliases:["state"]},
  {key:"city",label:"City",aliases:["city"]},
  {key:"pincode",label:"Pincode",aliases:["pincode","pin_code","zipcode","zip"]},
  {key:"sector",label:"Sector",aliases:["area_sector","sector"]},
  {key:"subSector",label:"Sub Sector",aliases:["sub_sector","subsector"]},
  {key:"inactiveStatus",label:"Inactive Status",aliases:["inactive_status","inactivestatus"]},
  {key:"dataVerificationStatus",label:"Data Verification Status",aliases:["data_verification_status","dataverificationstatus"]},
  {key:"dataVerificationDate",label:"Data Verification Date",aliases:["data_verification_date","dataverificationdate"]},
  {key:"photoVerificationStatus",label:"Photo Verification Status",aliases:["photo_verification_status","photoverificationstatus"]},
  {key:"photoVerificationDate",label:"Photo Verification Date",aliases:["photo_verification_date","photoverificationdate"]},
  {key:"lastScannedEvent",label:"Last Scanned Event",aliases:["last_scanned_event","lastscannedevent"]},
  {key:"lastScannedPlace",label:"Last Scanned Place",aliases:["last_scanned_place","lastscannedplace"]},
  {key:"sectorInchargeItsId",label:"Sector Incharge ITSID",aliases:["sector_incharge_itsid","sector_incharge_its_id","sectorinchargeitsid"]},
  {key:"sectorInchargeName",label:"Sector Incharge Name",aliases:["sector_incharge_name","sectorinchargename"]},
  {key:"sectorInchargeFemaleItsId",label:"Sector Incharge Female ITSID",aliases:["sector_incharge_female_itsid","sector_incharge_female_its_id"]},
  {key:"sectorInchargeFemaleName",label:"Sector Incharge Female Name",aliases:["sector_incharge_female_name"]},
  {key:"subSectorInchargeItsId",label:"Sub Sector Incharge ITSID",aliases:["sub_sector_incharge_itsid","sub_sector_incharge_its_id"]},
  {key:"subSectorInchargeName",label:"Sub Sector Incharge Name",aliases:["sub_sector_incharge_name"]},
  {key:"subSectorInchargeFemaleItsId",label:"Sub Sector Incharge Female ITSID",aliases:["sub_sector_incharge_female_itsid","sub_sector_incharge_female_its_id"]},
  {key:"subSectorInchargeFemaleName",label:"Sub Sector Incharge Female Name",aliases:["sub_sector_incharge_female_name"]}
];
var REPORT_COLUMNS=FIELD_OPTIONS;
var DEFAULT_COLUMNS=["its","name","age","gender","sector","hofId","hofFmType","phone","status"];
function normalizeKey(value){return String(value==null?"":value).toLowerCase().replace(/[^a-z0-9]/g,"");}
function rawValue(m,aliases){
  var source=m.source_data||{},pool=Object.assign({},source,m),wanted=aliases.map(normalizeKey);
  for(var i=0;i<wanted.length;i++){
    var direct=Object.keys(pool).find(function(k){return normalizeKey(k)===wanted[i];});
    if(direct!=null&&pool[direct]!==null&&pool[direct]!==undefined&&pool[direct]!=="")return pool[direct];
  }
  return "";
}
function rowValue(m,key,data){
  var field=FIELD_OPTIONS.find(function(x){return x.key===key;});
  var source=m.source_data||{},hofKey=source.HOF_ID||source.hof_id||m.HOF_ID||m.hof_id||"",hof=data.find(function(x){return String(x.its_number||x.its_id||"")===String(hofKey);});
  if(key==="hofId")return hofKey;
  if(key==="hofFmType"){var type=rawValue(m,["HOF_FM_TYPE","hof_fm_type"]);return type;}
  if(key==="hofIts")return hofKey;
  if(key==="hofName")return hof?hof.name:"";
  if(key==="age"){var age=getMuminAge(m);return age===null?rawValue(m,field.aliases):age;}
  if(key==="name")return m.name||rawValue(m,field.aliases);
  if(key==="its")return m.its_number||m.its_id||rawValue(m,field.aliases);
  if(key==="gender")return m.gender||rawValue(m,field.aliases);
  if(key==="sector")return m.area_sector||rawValue(m,field.aliases);
  if(key==="mobile")return m.phone||rawValue(m,field.aliases);
  if(key==="subSector"&&m.sub_sector_id){var sub=(data._subSectors||[]).find(function(x){return String(x.id)===String(m.sub_sector_id);});if(sub)return sub.name||"";}
  return field?rawValue(m,field.aliases):"";
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
  function exportExcel(){var exportData=data.slice();exportData._subSectors=ctx.subSectorsData||[];var out=rows.map(function(m){var item={};columns.forEach(function(key){var col=REPORT_COLUMNS.find(function(x){return x.key===key;});if(col)item[col.label]=rowValue(m,key,exportData);});return item;});var headers=columns.map(function(key){var col=REPORT_COLUMNS.find(function(x){return x.key===key;});return col?col.label:key;});toXLS(out,headers,"advanced_report");}
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
    <div className="card report-fields-card" style={{marginTop:16}}><div className="card-hdr"><span className="card-title">☰ Fields Name</span><span style={{fontSize:11,color:"#6b7280"}}>{columns.length} selected of {REPORT_COLUMNS.length}</span></div><div className="report-fields-selectall"><label><input type="checkbox" checked={columns.length===REPORT_COLUMNS.length} onChange={function(e){toggleAllFields(e.target.checked);}}/> Select all Fields</label></div><div className="report-fields-grid">{REPORT_COLUMNS.map(function(col){var selected=columns.indexOf(col.key)>=0;return <label key={col.key} className="report-field-option"><input type="checkbox" checked={selected} onChange={function(){toggleColumn(col.key);}}/><span>{col.label}</span></label>;})}</div>{columnError&&<div style={{color:"#b91c1c",fontSize:12,padding:"0 14px 12px"}}>{columnError}</div>}<div className="report-fields-footer"><span className="muted">Selected fields are used for the results table, Excel export and printed report.</span><button className="btn btn-primary btn-sm" onClick={exportExcel}>Download Data in Excel</button></div></div>
    <div className="card" style={{marginTop:16}}><div className="card-hdr"><span className="card-title">{template==="hof"?"HOF Names Directory":"Results"} ({rows.length})</span></div><div className="print-header" style={{padding:"14px 0"}}><h2 style={{margin:"0 0 4px"}}>Husaini Mohallah Database</h2><p style={{margin:0}}>{template==="hof"?"HOF Names Directory":template==="compact"?"Compact Mumin Register":"Detailed Mumin Register"} · {rows.length} records</p></div><div style={{overflowX:"auto"}}><table><thead><tr>{columns.map(function(key){var col=REPORT_COLUMNS.find(function(x){return x.key===key;});return <th key={key}>{col?col.label:key}</th>;})}</tr></thead><tbody>{rows.map(function(m){return <tr key={m.id}>{columns.map(function(key){var value=rowValue(m,key,Object.assign(data,{_subSectors:ctx.subSectorsData||[]}));return <td key={key}>{value===""||value===null?"—":value}</td>;})}</tr>;})}</tbody></table></div><div className="muted no-print" style={{padding:12}}>Showing all {rows.length} filtered results. Use Print Report for the selected layout.</div></div>
  </div>;
}
