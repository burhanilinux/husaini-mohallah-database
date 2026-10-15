import { useState } from "react";
import * as XLSX from "xlsx";
import { sbGet, sbInsert, logActivity } from "../lib/supabase.js";

const ALLOWED_YEARS = [1446, 1447];
const norm = value => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const num = value => {
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, value) : 0;
  const cleaned = String(value ?? "").replace(/[₹,\s]/g, "").replace(/[^0-9.()-]/g, "");
  const parsed = Number(cleaned.replace(/[()]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};
const headerAliases = {
  its: ["itsnumber", "itsno", "its", "itsid", "muminits"],
  name: ["muminname", "name", "mumin", "fullname"],
  year: ["hijriyear", "year", "hijri", "hijriyearh", "yearh"],
  paid: ["amountpaid", "amountcollected", "collected", "paid", "amount", "amountreceived"],
  due: ["amountdue", "totalamountdue", "due", "takmeendue", "totaldue"],
  previous: ["lastyeartakmeen", "previoustakmeen", "previousyearstakmeen", "lasttakmeen"],
  current: ["currentyeartakmeen", "currenttakmeen", "takmeen", "currentyearamount"],
  paymentDate: ["paymentdate", "datepaid", "collectiondate"],
  mode: ["paymentmode", "mode", "paymentmethod"],
  remarks: ["remarks", "remark", "notes", "comments"]
};
function getValue(row, aliases) {
  const key = Object.keys(row).find(k => aliases.includes(norm(k)));
  return key === undefined ? undefined : row[key];
}
function parseWorkbook(file, fallbackYear) {
  return file.arrayBuffer().then(buffer => {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    if (!workbook.SheetNames.length) throw new Error("The workbook has no worksheets.");
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const source = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    if (!source.length) throw new Error("The first worksheet is empty.");
    return source.map((row, index) => {
      const its = String(getValue(row, headerAliases.its) ?? "").replace(/\D/g, "").slice(0, 8);
      const rawYear = getValue(row, headerAliases.year);
      const parsedYear = Number(String(rawYear ?? "").replace(/[^0-9]/g, ""));
      const year = rawYear === undefined || String(rawYear).trim() === "" ? fallbackYear : parsedYear;
      const paidValue = getValue(row, headerAliases.paid);
      const paid = num(paidValue);
      const current = num(getValue(row, headerAliases.current));
      const dueValue = getValue(row, headerAliases.due);
      const due = dueValue === undefined || String(dueValue).trim() === "" ? (current || paid) : num(dueValue);
      return {
        sourceRow: index + 2,
        its_number: its,
        mumin_name: String(getValue(row, headerAliases.name) ?? "").trim(),
        year,
        previous_takmeen: num(getValue(row, headerAliases.previous)),
        current_takmeen: current,
        amount_due: Math.max(due, paid),
        amount_paid: paid,
        payment_date: String(getValue(row, headerAliases.paymentDate) ?? "").trim(),
        payment_mode: String(getValue(row, headerAliases.mode) ?? "").trim(),
        remarks: String(getValue(row, headerAliases.remarks) ?? "").trim()
      };
    }).filter(row => row.its_number || row.mumin_name || row.amount_paid > 0 || row.amount_due > 0);
  });
}

export function VajebaatExcelImport({ canEdit, ctx, onImported }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [fallbackYear, setFallbackYear] = useState(1447);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function close() {
    if (busy) return;
    setOpen(false); setFile(null); setPreview(null); setError(""); setResult(null);
  }
  async function chooseFile(nextFile) {
    setFile(nextFile); setPreview(null); setResult(null); setError("");
    if (!nextFile) return;
    if (!/\.xlsx?$/i.test(nextFile.name)) { setError("Please choose an Excel .xlsx or .xls file."); return; }
    try { setPreview(await parseWorkbook(nextFile, fallbackYear)); }
    catch (e) { setError(e.message || "Unable to read this workbook."); }
  }
  async function importRows() {
    if (!preview?.length) { setError("Choose an Excel file with data first."); return; }
    setBusy(true); setError(""); setResult(null);
    let inserted = 0, skipped = 0, invalid = 0, failed = 0;
    try {
      const existing = await sbGet("vajebaat_entries", "select=its_number,year");
      const keys = new Set((existing || []).map(r => String(r.its_number) + "|" + Number(r.year)));
      const muminRows = await sbGet("mumin_data", "select=its_number,name&deleted_at=is.null");
      const names = new Map((muminRows || []).map(r => [String(r.its_number).trim(), String(r.name || "").trim()]));
      const seen = new Set();
      for (const row of preview) {
        const key = row.its_number + "|" + Number(row.year);
        if (!/^\d{8}$/.test(row.its_number) || !ALLOWED_YEARS.includes(Number(row.year))) { invalid++; continue; }
        if (keys.has(key) || seen.has(key)) { skipped++; continue; }
        const canonicalName = names.get(row.its_number);
        const name = row.mumin_name || canonicalName;
        if (!name || !canonicalName) { invalid++; continue; }
        const due = row.amount_due;
        const paid = row.amount_paid;
        const payload = {
          its_number: row.its_number, mumin_name: name, year: Number(row.year),
          previous_takmeen: row.previous_takmeen, current_takmeen: row.current_takmeen,
          amount_due: due, amount_paid: paid,
          payment_status: paid >= due && due > 0 ? "Paid" : paid > 0 ? "Partially Paid" : "Unpaid",
          payment_mode: paid > 0 ? (["Cash","Cheque","DD","Bank Transfer","UPI","Other"].includes(row.payment_mode) ? row.payment_mode : "Cash") : null,
          payment_date: paid > 0 ? (/^\d{4}-\d{2}-\d{2}$/.test(row.payment_date) ? row.payment_date : null) : null,
          remarks: row.remarks || "",
          created_by: ctx.session?.user?.email || "Excel Import",
          updated_at: new Date().toISOString()
        };
        try {
          await sbInsert("vajebaat_entries", payload);
          keys.add(key); seen.add(key); inserted++;
        } catch (e) {
          if (e.code === "23505") skipped++; else { failed++; if (!error) setError("Some rows could not be imported. Check the summary below and database permissions."); }
        }
      }
      await logActivity("import", "vajebaat", inserted + " records from " + file?.name, ctx.session?.user?.email);
      setResult({ inserted, skipped, invalid, failed });
      if (inserted > 0) await onImported?.();
    } catch (e) { setError(e.message || "Unable to import workbook."); }
    finally { setBusy(false); }
  }

  if (!canEdit) return null;
  return <>
    <button className="btn btn-primary" onClick={() => { setOpen(true); setError(""); setResult(null); }}>↑ Import Excel</button>
    {open && <div className="modal-overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <section className="modal vajebaat-modal" role="dialog" aria-modal="true" aria-labelledby="vajebaat-import-title">
        <div className="modal-hdr"><div><div id="vajebaat-import-title" className="modal-title">Import Vajebaat Excel</div><div className="page-sub">Imports new records only; existing ITS/year records are skipped.</div></div><button className="modal-close" onClick={close} disabled={busy} aria-label="Close">×</button></div>
        <div className="modal-body">
          <div className="form-grp"><label>Excel file (.xlsx or .xls)</label><input type="file" accept=".xlsx,.xls" onChange={e => chooseFile(e.target.files?.[0] || null)} disabled={busy} /></div>
          <div className="form-grp"><label>Default Hijri year (used only if the sheet has no year column)</label><select value={fallbackYear} onChange={e => { const next = Number(e.target.value); setFallbackYear(next); if (file) chooseFile(file); }} disabled={busy}><option value={1446}>1446H</option><option value={1447}>1447H</option></select></div>
          <p className="page-sub">Accepted years: 1446H and 1447H only. The Amount/Collected column is imported as Amount Paid. Rows for 1448H or other years are skipped. Names are checked against Mumin Data when available. No existing records are overwritten.</p>
          {preview && <div className="vajebaat-preview"><span>Rows detected</span><b>{preview.length}</b><span>Valid ITS rows: <b>{preview.filter(r => /^\d{8}$/.test(r.its_number)).length}</b></span></div>}
          {preview?.length > 0 && <div className="table-wrap" style={{maxHeight:220,overflow:"auto",marginTop:12}}><table className="vajebaat-table"><thead><tr><th>ITS Number</th><th>Name</th><th>Year</th><th>Amount Paid</th></tr></thead><tbody>{preview.slice(0,8).map((r,i)=><tr key={r.sourceRow + "-" + i}><td>{r.its_number || "—"}</td><td>{r.mumin_name || "From Mumin Data"}</td><td>{r.year || "—"}</td><td>{r.amount_paid}</td></tr>)}</tbody></table>{preview.length>8 && <p className="page-sub">Showing first 8 rows of {preview.length}.</p>}</div>}
          {error && <div className="err-banner" role="alert" style={{marginTop:12}}>{error}</div>}
          {result && <div className="vajebaat-notice" role="status" style={{marginTop:12}}>Imported: {result.inserted} · Duplicates skipped: {result.skipped} · Invalid rows skipped: {result.invalid} · Failed: {result.failed}</div>}
        </div>
        <div className="modal-ftr"><button className="btn btn-ghost" onClick={close} disabled={busy}>Close</button><button className="btn btn-primary" onClick={importRows} disabled={busy || !preview?.length}>{busy ? "Importing…" : "Import Records"}</button></div>
      </section>
    </div>}
  </>;
}
