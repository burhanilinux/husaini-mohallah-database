import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { sbGet, sbInsert, sbUpdate, sbDelete, logActivity } from "../lib/supabase.js";
import { useAppContext } from "../context/AppContext.jsx";
import { VajebaatExcelImport } from "../components/VajebaatExcelImport.jsx";

const THIS_YEAR = 1448;
const EMPTY = { its_number:"", mumin_name:"", year:THIS_YEAR, previous_takmeen:"0", current_takmeen:"0", amount_due:"0", amount_paid:"0", payment_status:"Unpaid", payment_mode:"Cash", payment_date:"", cheque_dd_no:"", takmeen_signed_by:"", takmeen_signed_date:"", remarks:"" };
const MODES = ["Cash","Cheque","DD","Bank Transfer","UPI","Other"];
const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(n)||0);
const dateToday = () => new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"});
const safeNum = v => Math.max(0, Number(v)||0);
const html = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

export function VajebaatPage() {
  const ctx = useAppContext();
  const canEdit = !!ctx.canEdit;
  const isAdmin = !!ctx.isAdmin;
  const [rows,setRows] = useState([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [search,setSearch] = useState("");
  const [year,setYear] = useState(THIS_YEAR);
  const [status,setStatus] = useState("All");
  const [form,setForm] = useState(null);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { const data = await sbGet("vajebaat_entries","select=*&order=year.desc,its_number.asc"); setRows(data||[]); }
    catch(e) { setError("Unable to load Vajebaat records. "+(e.message||"Check database access.")); }
    finally { setLoading(false); }
  }
  useEffect(()=>{load();},[]);

  const shown = useMemo(()=>rows.filter(r=>{
    const q=search.trim().toLowerCase();
    return Number(r.year)===Number(year) && (!q || String(r.its_number).includes(q) || String(r.mumin_name||"").toLowerCase().includes(q)) && (status==="All"||r.payment_status===status);
  }),[rows,search,year,status]);
  const totals = useMemo(()=>shown.reduce((a,r)=>{a.due+=safeNum(r.amount_due);a.paid+=safeNum(r.amount_paid);a.count++;return a;},{due:0,paid:0,count:0}),[shown]);

  function change(k,v){setForm(f=>({...f,[k]:v}));}
  function printReport(){
    if(loading){setError("Please wait for the records to finish loading, then print.");return;}
    if(!shown.length){setError("No records to print for the selected filters.");return;}
    setError("");
    const w=window.open("","_blank","width=1200,height=800");
    if(!w){setError("Your browser blocked the print window. Allow pop-ups for this site and try again.");return;}
    const details=shown.map(r=>`<tr><td>${html(r.its_number)}</td><td>${html(r.mumin_name)}</td><td class="num">${html(money(r.previous_takmeen))}</td><td class="num">${html(money(r.current_takmeen))}</td><td class="num">${html(money(r.amount_due))}</td><td class="num">${html(money(r.amount_paid))}</td><td class="num">${html(money(Math.max(0,safeNum(r.amount_due)-safeNum(r.amount_paid))))}</td><td>${html(r.payment_status||"—")}</td><td>${html(r.payment_mode||"—")}</td></tr>`).join("");
    const filterText=[status==="All"?"All statuses":status,search.trim()?"Search: "+search.trim():""].filter(Boolean).join(" · ");
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Vajebaat Report — ${html(year)}H</title><style>
      @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;font-size:10px;margin:0}h1{font-size:20px;margin:0 0 4px} .sub{font-size:11px;color:#444;margin-bottom:14px}.meta{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #777;padding:0 0 8px;margin-bottom:10px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}.stat{border:1px solid #aaa;padding:8px}.label{font-size:9px;color:#444;margin-bottom:4px}.value{font-size:14px;font-weight:bold}table{width:100%;border-collapse:collapse;font-size:9px}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th,td{border:1px solid #aaa;padding:5px 6px;text-align:left;vertical-align:top}th{background:#eee;font-weight:bold}.num{text-align:right;white-space:nowrap}.foot{margin-top:10px;font-size:9px;color:#444}@media screen{body{padding:20px}.print-tip{margin:0 0 14px;padding:10px;background:#f2f2f2;border:1px solid #ccc;font-size:12px}}@media print{.print-tip{display:none}}
    </style></head><body><div class="print-tip">Print preview is ready. Choose Print, or press Ctrl+P to print / save as PDF.</div><h1>Husaini Mohallah — Vajebaat Report</h1><div class="sub">Year-wise Takmeen and payment records</div><div class="meta"><b>Hijri Year: ${html(year)}H</b><span>${html(filterText)}</span><span>Records: ${shown.length}</span></div><div class="summary"><div class="stat"><div class="label">Total Records</div><div class="value">${totals.count}</div></div><div class="stat"><div class="label">Total Amount Due</div><div class="value">${html(money(totals.due))}</div></div><div class="stat"><div class="label">Total Amount Paid</div><div class="value">${html(money(totals.paid))}</div></div><div class="stat"><div class="label">Balance</div><div class="value">${html(money(Math.max(0,totals.due-totals.paid)))}</div></div></div><table><thead><tr><th>ITS Number</th><th>Mumin Name</th><th>Last Year Takmeen</th><th>Current Takmeen</th><th>Amount Due</th><th>Amount Paid</th><th>Balance</th><th>Status</th><th>Payment Mode</th></tr></thead><tbody>${details}</tbody></table><div class="foot">Generated from Husaini Mohallah Database. Amounts shown in INR.</div><script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),350)});<\/script></body></html>`);
    w.document.close();
  }
  async function lookupMumin(){
    const its=String(form?.its_number||"").replace(/\D/g,"").slice(0,8);
    change("its_number",its);
    if(its.length!==8){setError("Enter a valid 8-digit ITS number.");return;}
    try {
      const found=await sbGet("mumin_data","its_number=eq."+encodeURIComponent(its)+"&deleted_at=is.null&select=its_number,name");
      if(found?.[0]){setForm(f=>({...f,its_number:its,mumin_name:found[0].name||""}));setError("");}
      else setError("This ITS number was not found in Mumin Data.");
    } catch(e){setError(e.message||"Unable to find Mumin.");}
  }
  function editRecord(r){setForm({...r});setError("");setNotice("");}
  function newRecord(){setForm({...EMPTY,year:Number(year)});setError("");setNotice("");}
  async function save(e){
    e.preventDefault(); if(!form)return;
    const its=String(form.its_number||"").trim();
    if(!/^\d{8}$/.test(its)||!String(form.mumin_name||"").trim()){setError("Fetch a valid Mumin using the 8-digit ITS number first.");return;}
    const due=safeNum(form.amount_due), paid=safeNum(form.amount_paid);
    if(paid>due){setError("Amount paid cannot exceed amount due.");return;}
    const payload={
      its_number:its,mumin_name:String(form.mumin_name).trim(),year:Number(form.year),
      previous_takmeen:safeNum(form.previous_takmeen),current_takmeen:safeNum(form.current_takmeen),
      amount_due:due,amount_paid:paid,
      payment_status:paid>=due&&due>0?"Paid":paid>0?"Partially Paid":"Unpaid",
      payment_mode:paid>0?(form.payment_mode||"Cash"):null,
      payment_date:paid>0?(form.payment_date||dateToday()):null,
      cheque_dd_no:paid>0?(String(form.cheque_dd_no||"").trim()||null):null,
      takmeen_signed_by:String(form.takmeen_signed_by||"").trim()||null,
      takmeen_signed_date:form.takmeen_signed_date||null,
      remarks:String(form.remarks||"").trim(),
      updated_at:new Date().toISOString()
    };
    setSaving(true);setError("");
    try{
      if(form.id){await sbUpdate("vajebaat_entries",form.id,payload);await logActivity("update","vajebaat",its+" · "+payload.year,ctx.session?.user?.email);}
      else {payload.created_by=ctx.session?.user?.email||"Unknown";await sbInsert("vajebaat_entries",payload);await logActivity("create","vajebaat",its+" · "+payload.year,ctx.session?.user?.email);}
      setForm(null);setNotice("Vajebaat record saved successfully.");await load();
    }catch(e){setError(e.code==="23505"?"A Vajebaat record already exists for this ITS and year. Open the existing record to edit it.":(e.message||"Unable to save record."));}
    finally{setSaving(false);}
  }
  async function remove(r){
    if(!window.confirm("Delete Vajebaat record for "+r.mumin_name+" (ITS "+r.its_number+") — "+r.year+"?"))return;
    try{await sbDelete("vajebaat_entries",r.id);await logActivity("delete","vajebaat",r.its_number+" · "+r.year,ctx.session?.user?.email);setNotice("Record deleted.");await load();}
    catch(e){setError(e.message||"Unable to delete record.");}
  }
  function exportExcel(){
    if(!shown.length){setError("No records to export for the selected filters.");return;}
    const data=shown.map(r=>({"ITS Number":r.its_number,"Mumin Name":r.mumin_name,"Hijri Year":r.year,"Last Year Takmeen":Number(r.previous_takmeen)||0,"Current Year Takmeen":Number(r.current_takmeen)||0,"Amount Due":Number(r.amount_due)||0,"Amount Paid":Number(r.amount_paid)||0,"Balance":Math.max(0,(Number(r.amount_due)||0)-(Number(r.amount_paid)||0)),"Status":r.payment_status,"Payment Mode":r.payment_mode||"","Payment Date":r.payment_date||"","Cheque/DD No.":r.cheque_dd_no||"","Takmeen Signed By":r.takmeen_signed_by||"","Signed Date":r.takmeen_signed_date||"","Remarks":r.remarks||""}));
    const ws=XLSX.utils.json_to_sheet(data);ws["!cols"]=[{wch:14},{wch:28},{wch:12},{wch:18},{wch:20},{wch:14},{wch:14},{wch:14},{wch:16},{wch:16},{wch:14},{wch:18},{wch:24},{wch:14},{wch:36}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Vajebaat");XLSX.writeFile(wb,"Vajebaat_"+year+".xlsx");
  }
  return <div className="vajebaat-page">
    <div className="page-hdr"><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,flexWrap:"wrap"}}><div><div className="page-title">Vajebaat Module</div><div className="page-sub">Year-wise Takmeen, payment tracking and Mumin records</div></div><div className="vajebaat-actions"><button className="btn btn-ghost" onClick={load}>↻ Refresh</button><button className="btn btn-ghost" onClick={printReport}>▣ Print Report</button><button className="btn btn-ghost" onClick={exportExcel}>↓ Export Excel</button>{canEdit&&<><VajebaatExcelImport canEdit={canEdit} ctx={ctx} onImported={load}/><button className="btn btn-primary" onClick={newRecord}>＋ New Entry</button></>}</div></div></div>
    {error&&<div className="err-banner" role="alert" style={{marginBottom:12}}>{error}<button className="btn btn-ghost btn-sm" style={{marginLeft:8}} onClick={()=>setError("")}>Dismiss</button></div>}
    {notice&&<div className="vajebaat-notice" role="status">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
    <div className="stats-grid vajebaat-stats"><div className="stat-card"><div className="stat-lbl">Records</div><div className="stat-val">{totals.count}</div><div className="stat-desc">Selected year & filters</div></div><div className="stat-card"><div className="stat-lbl">Total Takmeen / Due</div><div className="stat-val">{money(totals.due)}</div><div className="stat-desc">Amount due</div></div><div className="stat-card"><div className="stat-lbl">Total Collected</div><div className="stat-val">{money(totals.paid)}</div><div className="stat-desc">Amount received</div></div><div className="stat-card"><div className="stat-lbl">Balance</div><div className="stat-val">{money(Math.max(0,totals.due-totals.paid))}</div><div className="stat-desc">Outstanding amount</div></div></div>
    <section className="card"><div className="toolbar vajebaat-filters"><select aria-label="Hijri year" value={year} onChange={e=>setYear(Number(e.target.value))}>{Array.from({length:11},(_,i)=>THIS_YEAR-i).map(y=><option key={y} value={y}>{y}H</option>)}</select><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by Mumin name or ITS number"/><select aria-label="Payment status" value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option>Paid</option><option>Partially Paid</option><option>Unpaid</option></select></div>
    <div className="print-report-heading">Vajebaat Report — {year}H <span>{status==="All"?"All statuses":status}{search.trim()?" · Search: "+search.trim():""}</span></div>
    <div className="table-wrap"><table className="vajebaat-table"><thead><tr><th>ITS / Mumin</th><th>Last Year Takmeen</th><th>Current Takmeen</th><th>Due</th><th>Paid</th><th>Balance</th><th>Status</th><th>Mode</th><th className="no-print">Actions</th></tr></thead><tbody>{loading?<tr><td colSpan="9" className="empty">Loading Vajebaat records…</td></tr>:shown.map(r=><tr key={r.id}><td><b>{r.its_number}</b><div className="vajebaat-name">{r.mumin_name}</div></td><td>{money(r.previous_takmeen)}</td><td>{money(r.current_takmeen)}</td><td>{money(r.amount_due)}</td><td>{money(r.amount_paid)}</td><td>{money(Math.max(0,safeNum(r.amount_due)-safeNum(r.amount_paid)))}</td><td><span className={"vajebaat-status "+String(r.payment_status).toLowerCase().replace(/\s/g,"-")}>{r.payment_status}</span></td><td>{r.payment_mode||"—"}</td><td className="no-print"><div className="vajebaat-row-actions">{canEdit&&<button className="btn btn-ghost btn-sm" onClick={()=>editRecord(r)}>Edit</button>}{isAdmin&&<button className="btn btn-danger btn-sm" onClick={()=>remove(r)}>Delete</button>}</div></td></tr>)}{!loading&&!shown.length&&<tr><td colSpan="9" className="empty">No Vajebaat entries for {year}H. Choose New Entry to add one.</td></tr>}</tbody></table></div></section>
    {form&&<div className="modal-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)setForm(null);}}><section className="modal vajebaat-modal" role="dialog" aria-modal="true" aria-labelledby="vajebaat-form-title"><div className="modal-hdr"><div><div id="vajebaat-form-title" className="modal-title">{form.id?"Edit Vajebaat Entry":"New Vajebaat Entry"}</div><div className="page-sub">Enter Takmeen and payment details</div></div><button className="modal-close" onClick={()=>setForm(null)} aria-label="Close">×</button></div><form onSubmit={save}><div className="modal-body"><div className="form-grid">
      <div className="form-grp"><label>ITS Number *</label><div className="vajebaat-lookup"><input value={form.its_number||""} maxLength={8} inputMode="numeric" disabled={!!form.id} onChange={e=>change("its_number",e.target.value.replace(/\D/g,"").slice(0,8))} placeholder="8-digit ITS" required/><button type="button" className="btn btn-ghost" disabled={!!form.id} onClick={lookupMumin}>Fetch</button></div></div>
      <div className="form-grp"><label>Mumin Name *</label><input value={form.mumin_name||""} readOnly placeholder="Fetch from Mumin Data" required/></div>
      <div className="form-grp"><label>Hijri Year *</label><input type="number" min="1400" max="1600" value={form.year} onChange={e=>change("year",e.target.value)} required/></div>
      <div className="form-grp"><label>Last Year Takmeen (₹)</label><input type="number" min="0" step="0.01" value={form.previous_takmeen} onChange={e=>change("previous_takmeen",e.target.value)}/></div>
      <div className="form-grp"><label>Current Year Takmeen (₹)</label><input type="number" min="0" step="0.01" value={form.current_takmeen} onChange={e=>change("current_takmeen",e.target.value)}/></div>
      <div className="form-grp"><label>Total Amount Due (₹) *</label><input type="number" min="0" step="0.01" value={form.amount_due} onChange={e=>change("amount_due",e.target.value)} required/></div>
      <div className="form-grp"><label>Amount Paid (₹) *</label><input type="number" min="0" step="0.01" value={form.amount_paid} onChange={e=>change("amount_paid",e.target.value)} required/></div>
      <div className="form-grp"><label>Payment Mode</label><select value={form.payment_mode||"Cash"} onChange={e=>change("payment_mode",e.target.value)}>{MODES.map(m=><option key={m}>{m}</option>)}</select></div>
      <div className="form-grp"><label>Payment Date</label><input type="date" value={form.payment_date||""} onChange={e=>change("payment_date",e.target.value)}/></div>
      <div className="form-grp"><label>Cheque / DD / Reference No.</label><input value={form.cheque_dd_no||""} onChange={e=>change("cheque_dd_no",e.target.value)} placeholder="Optional"/></div>
      <div className="form-grp"><label>Takmeen Signed By</label><input value={form.takmeen_signed_by||""} onChange={e=>change("takmeen_signed_by",e.target.value)} placeholder="Aamil Saheb"/></div>
      <div className="form-grp"><label>Takmeen Signed Date</label><input type="date" value={form.takmeen_signed_date||""} onChange={e=>change("takmeen_signed_date",e.target.value)}/></div>
      <div className="form-grp full"><label>Remarks</label><textarea rows="3" value={form.remarks||""} onChange={e=>change("remarks",e.target.value)} placeholder="Receipt reference or notes…"/></div>
      </div><div className="vajebaat-preview"><span>Calculated payment status</span><b>{safeNum(form.amount_paid)>=safeNum(form.amount_due)&&safeNum(form.amount_due)>0?"Paid":safeNum(form.amount_paid)>0?"Partially Paid":"Unpaid"}</b><span>Balance: <b>{money(Math.max(0,safeNum(form.amount_due)-safeNum(form.amount_paid)))}</b></span></div></div><div className="modal-ftr"><button type="button" className="btn btn-ghost" disabled={saving} onClick={()=>setForm(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving?"Saving…":"Save Entry"}</button></div></form></section></div>}
  </div>;
}
