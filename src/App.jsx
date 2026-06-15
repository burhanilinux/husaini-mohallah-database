import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://fluflwpnbqfqcvcjkgjn.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdWZsd3BuYnFmcWN2Y2prZ2puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTgwNTQsImV4cCI6MjA5NjU3NDA1NH0.LT7b18SGQXeth32XhOtVd-CJ2t3WiREf8daze_VwDdo";

function getToken() {
  try {
    var s = localStorage.getItem("hm_session");
    if (s) { var p = JSON.parse(s); return p.access_token || SUPABASE_ANON; }
  } catch(e) {}
  return SUPABASE_ANON;
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON,
    "Authorization": "Bearer " + getToken(),
    "Prefer": "return=representation",
  };
}

async function sbGet(table, params) {
  const url = SUPABASE_URL + "/rest/v1/" + table + "?" + (params || "");
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function sbInsert(table, body) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + table, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function sbUpdate(table, id, body) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?id=eq." + id, {
    method: "PATCH", headers: getHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function sbDelete(table, id) {
  const h = Object.assign({}, getHeaders(), { Prefer: "return=minimal" });
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?id=eq." + id, {
    method: "DELETE", headers: h,
  });
  if (!res.ok) throw new Error(await res.text());
}
async function uploadStorage(file, path) {
  const res2 = await fetch(file.dataUrl);
  const blob = await res2.blob();
  const res = await fetch(SUPABASE_URL + "/storage/v1/object/uploads/" + path, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON,
      "Authorization": "Bearer " + getToken(),
      "Content-Type": blob.type,
    },
    body: blob,
  });
  if (!res.ok) throw new Error(await res.text());
  return SUPABASE_URL + "/storage/v1/object/public/uploads/" + path;
}

async function sbSignIn(email, password) {
  const res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Login failed");
  return data;
}
async function sbSignOut(token) {
  await fetch(SUPABASE_URL + "/auth/v1/logout", {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + token },
  });
}
async function sbGetUser(token) {
  const res = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + token },
  });
  if (!res.ok) return null;
  return res.json();
}

const UMOOR_TYPES = [
  "Umoor Talimiyah (Education)",
  "Umoor Mawarid Bashariyah (Human Resources)",
  "Umoor Marafiq Burhaniyah (Upliftment)",
  "Umoor Maliyah (Finance)",
  "Umoor Kharejiyah (Public Relations)",
  "Umoor Iqtesadiyah (Qardan Hasanah)",
  "Umoor Faizul Mawaid Burhaniyah (FMB)",
  "Umoor Deeniyah (Deeni Umoor)",
  "Umoor Al-Sehaat (Medical)",
  "Umoor Al-Qaza (Legal)",
  "Umoor Dakheliyah (I.T)",
  "Umoor Al-Amlaak (Trusts & Properties)",
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2022 + 1 }, function(_, i) { return 2022 + i; });
const MUMIN_COLS = ["its_number","name","age","gender","phone","email","address","status"];
const FILE_COLS  = ["file_no","umoor_type","year","title","description","status","date"];

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function toXLS(rows, cols, sheetName) {
  // Build a simple XML-based Excel file (SpreadsheetML)
  var xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
  xml += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
  xml += '<Worksheet ss:Name="' + (sheetName || 'Sheet1') + '"><Table>';
  // Header row
  xml += '<Row>';
  cols.forEach(function(c) { xml += '<Cell><Data ss:Type="String">' + c + '</Data></Cell>'; });
  xml += '</Row>';
  // Data rows
  rows.forEach(function(r) {
    xml += '<Row>';
    cols.forEach(function(c) {
      var v = r[c] === null || r[c] === undefined ? '' : String(r[c]);
      var t = isNaN(v) || v === '' ? 'String' : 'Number';
      v = v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      xml += '<Cell><Data ss:Type="' + t + '">' + v + '</Data></Cell>';
    });
    xml += '</Row>';
  });
  xml += '</Table></Worksheet></Workbook>';
  downloadBlob(xml, sheetName ? sheetName + '.xls' : 'export.xls', 'application/vnd.ms-excel');
}

function toCSV(rows, cols) {
  const escape = (v) => {
    const s = String(v == null ? "" : v).split('"').join('""');
    return (s.indexOf(",") >= 0 || s.indexOf("\n") >= 0 || s.indexOf('"') >= 0)
      ? '"' + s + '"' : s;
  };
  const lines = [cols.join(",")].concat(
    rows.map(r => cols.map(c => escape(r[c])).join(","))
  );
  return lines.join("\n");
}
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(function(h) { var t = h.trim(); if (t.charAt(0) === '"') t = t.slice(1); if (t.charAt(t.length-1) === '"') t = t.slice(0,-1); return t; });
  return lines.slice(1).map(function(line) {
    var vals = [], cur = "", inQ = false, i = 0;
    for (; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { vals.push(cur); cur = ""; }
      else { cur += ch; }
    }
    vals.push(cur);
    var obj = {};
    headers.forEach(function(h, idx) { obj[h] = (vals[idx] || "").trim(); });
    return obj;
  });
}

function fileToBase64(file) {
  return new Promise(function(res, rej) {
    var r = new FileReader();
    r.onload = function() { res(r.result); };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function fmtBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b/1024).toFixed(1) + " KB";
  return (b/1048576).toFixed(1) + " MB";
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Jost:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#0d1117;color:#e2d9c9;font-family:'Jost',sans-serif}
.layout{display:flex;min-height:100vh}
.sidebar{width:260px;flex-shrink:0;background:linear-gradient(180deg,#111820,#0d1117);border-right:1px solid rgba(184,152,90,.15);display:flex;flex-direction:column;position:fixed;height:100vh;overflow-y:auto;z-index:10}
.sb-logo{padding:28px 24px 20px;border-bottom:1px solid rgba(184,152,90,.12)}
.sb-arabic{font-family:'Amiri',serif;font-size:22px;color:#c9a84c;line-height:1.3}
.sb-sub{font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#6b7280;margin-top:4px}
.cloud-badge{display:inline-flex;align-items:center;gap:4px;background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.2);border-radius:10px;padding:2px 8px;font-size:10px;margin-top:8px}
.nav{padding:16px 12px;flex:1}
.nav-lbl{font-size:9px;text-transform:uppercase;letter-spacing:3px;color:#4b5563;padding:10px 12px 6px}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;font-size:13px;color:#9ca3af;transition:all .2s;margin-bottom:2px;border:1px solid transparent}
.nav-item:hover{background:rgba(184,152,90,.06);color:#e2d9c9}
.nav-item.active{background:rgba(184,152,90,.1);color:#c9a84c;border-color:rgba(184,152,90,.2);font-weight:500}
.user-box{margin:8px 12px;background:rgba(184,152,90,.05);border:1px solid rgba(184,152,90,.1);border-radius:10px;padding:12px 14px}
.user-role{font-size:10px;color:#c9a84c;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.user-email{font-size:11px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.signout-btn{width:100%;margin-top:8px;background:transparent;border:1px solid rgba(239,68,68,.2);color:#f87171;border-radius:6px;padding:5px;font-size:11px;cursor:pointer;font-family:'Jost',sans-serif}
.signout-btn:hover{background:rgba(239,68,68,.08)}
.sb-footer{padding:16px 24px;border-top:1px solid rgba(184,152,90,.1);font-size:11px;color:#374151}
.main{margin-left:260px;padding:36px;flex:1}
.page-hdr{margin-bottom:32px}
.page-title{font-family:'Amiri',serif;font-size:28px;color:#c9a84c;font-weight:700}
.page-sub{font-size:13px;color:#6b7280;margin-top:4px}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px}
.stat-card{background:rgba(255,255,255,.02);border:1px solid rgba(184,152,90,.12);border-radius:12px;padding:20px;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#c9a84c,transparent)}
.stat-lbl{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#6b7280}
.stat-val{font-size:32px;font-weight:600;color:#e2d9c9;margin-top:6px;line-height:1}
.stat-desc{font-size:12px;color:#4b5563;margin-top:4px}
.card{background:rgba(255,255,255,.02);border:1px solid rgba(184,152,90,.1);border-radius:12px;overflow:hidden;margin-bottom:24px}
.card-hdr{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid rgba(184,152,90,.1)}
.card-title{font-size:14px;font-weight:600;color:#e2d9c9}
.toolbar{display:flex;align-items:center;gap:12px;padding:16px 24px;border-bottom:1px solid rgba(184,152,90,.08);flex-wrap:wrap}
input,select,textarea{background:rgba(255,255,255,.04);border:1px solid rgba(184,152,90,.15);color:#e2d9c9;border-radius:8px;padding:8px 12px;font-size:13px;font-family:'Jost',sans-serif;outline:none;transition:border .2s;width:100%}
input:focus,select:focus,textarea:focus{border-color:rgba(201,168,76,.4)}
input::placeholder,textarea::placeholder{color:#4b5563}
select option{background:#111820}
textarea{resize:vertical;min-height:72px}
.btn{padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:none;transition:all .2s;font-family:'Jost',sans-serif;display:inline-flex;align-items:center;gap:6px}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-primary{background:#c9a84c;color:#0d1117}
.btn-primary:hover:not(:disabled){background:#dbb95d}
.btn-ghost{background:transparent;border:1px solid rgba(184,152,90,.2);color:#9ca3af}
.btn-ghost:hover:not(:disabled){border-color:rgba(201,168,76,.4);color:#c9a84c}
.btn-danger{background:transparent;border:1px solid rgba(239,68,68,.2);color:#f87171;font-size:12px;padding:5px 10px}
.btn-danger:hover:not(:disabled){background:rgba(239,68,68,.08)}
.btn-sm{padding:5px 10px;font-size:12px}
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#6b7280;padding:12px 20px;border-bottom:1px solid rgba(184,152,90,.1);font-weight:500}
td{padding:13px 20px;font-size:13px;color:#d1c9bb;border-bottom:1px solid rgba(255,255,255,.03);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(184,152,90,.03)}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500}
.badge-active{background:rgba(52,211,153,.1);color:#34d399;border:1px solid rgba(52,211,153,.2)}
.badge-closed{background:rgba(107,114,128,.1);color:#9ca3af;border:1px solid rgba(107,114,128,.2)}
.badge-pending{background:rgba(251,191,36,.1);color:#fbbf24;border:1px solid rgba(251,191,36,.2)}
.badge-male{background:rgba(96,165,250,.1);color:#60a5fa;border:1px solid rgba(96,165,250,.15)}
.badge-female{background:rgba(244,114,182,.1);color:#f472b6;border:1px solid rgba(244,114,182,.15)}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:100;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.modal{background:#111820;border:1px solid rgba(184,152,90,.2);border-radius:16px;width:580px;max-height:88vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.5)}
.modal-hdr{padding:24px 28px 20px;border-bottom:1px solid rgba(184,152,90,.1);display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#111820;z-index:1}
.modal-title{font-family:'Amiri',serif;font-size:20px;color:#c9a84c}
.modal-close{background:none;border:none;color:#6b7280;cursor:pointer;font-size:22px;line-height:1;padding:0;width:auto}
.modal-close:hover{color:#e2d9c9}
.modal-body{padding:24px 28px}
.modal-ftr{padding:16px 28px;border-top:1px solid rgba(184,152,90,.1);display:flex;justify-content:flex-end;gap:10px;position:sticky;bottom:0;background:#111820}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.form-grp{display:flex;flex-direction:column;gap:6px}
.form-grp.full{grid-column:span 2}
label{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#6b7280}
.year-tabs{display:flex;gap:6px;margin-bottom:24px;flex-wrap:wrap}
.year-tab{padding:7px 18px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid rgba(184,152,90,.15);color:#6b7280;background:transparent;transition:all .2s}
.year-tab.active{background:#c9a84c;color:#0d1117;border-color:#c9a84c}
.year-tab:hover:not(.active){border-color:rgba(201,168,76,.3);color:#c9a84c}
.umoor-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.umoor-card{background:rgba(255,255,255,.02);border:1px solid rgba(184,152,90,.1);border-radius:10px;padding:16px;cursor:pointer;transition:all .2s}
.umoor-card:hover{border-color:rgba(201,168,76,.3);background:rgba(184,152,90,.05)}
.umoor-num{font-size:11px;color:#c9a84c;font-weight:600;margin-bottom:4px}
.umoor-name{font-size:12px;color:#e2d9c9;font-weight:500}
.umoor-count{font-size:11px;color:#6b7280;margin-top:4px}
.empty{text-align:center;padding:48px;color:#4b5563}
.empty-icon{font-size:36px;margin-bottom:12px;opacity:.4}
.toast{position:fixed;bottom:24px;right:24px;z-index:999;background:#111820;border-radius:10px;padding:14px 20px;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.4);display:flex;align-items:center;gap:10px;animation:slideIn .3s ease}
.toast-success{border:1px solid rgba(52,211,153,.3);color:#34d399}
.toast-error{border:1px solid rgba(239,68,68,.3);color:#f87171}
@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:none;opacity:1}}
.file-no{font-family:monospace;font-size:12px;color:#c9a84c}
.act-col{display:flex;gap:8px;align-items:center}
.sec-div{height:1px;background:rgba(184,152,90,.1);margin:20px 0}
.sec-lbl{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#c9a84c;margin-bottom:12px;font-weight:600}
.attach-chip{display:inline-flex;align-items:center;gap:4px;background:rgba(201,168,76,.1);color:#c9a84c;border-radius:12px;padding:2px 8px;font-size:11px;border:1px solid rgba(201,168,76,.2)}
.upload-zone{border:2px dashed rgba(184,152,90,.25);border-radius:10px;padding:24px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(184,152,90,.02)}
.upload-zone:hover{border-color:#c9a84c;background:rgba(201,168,76,.05)}
.upload-zone-icon{font-size:28px;margin-bottom:8px;opacity:.6}
.upload-zone-text{font-size:13px;color:#9ca3af}
.upload-zone-sub{font-size:11px;color:#4b5563;margin-top:4px}
.att-list{display:flex;flex-direction:column;gap:8px;margin-top:12px}
.att-item{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.03);border:1px solid rgba(184,152,90,.1);border-radius:8px;padding:8px 12px}
.att-thumb{width:36px;height:36px;border-radius:6px;background:rgba(184,152,90,.1);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;overflow:hidden}
.att-thumb img{width:100%;height:100%;object-fit:cover}
.att-info{flex:1;min-width:0}
.att-name{font-size:12px;color:#e2d9c9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.att-meta{font-size:11px;color:#6b7280}
.att-rm{background:none;border:none;color:#6b7280;cursor:pointer;font-size:16px;padding:2px 6px;border-radius:4px;width:auto}
.att-rm:hover{color:#f87171;background:rgba(239,68,68,.08)}
.att-view{background:none;border:1px solid rgba(184,152,90,.2);color:#c9a84c;cursor:pointer;font-size:11px;padding:3px 8px;border-radius:4px;width:auto}
.att-view:hover{background:rgba(184,152,90,.08)}
.pdf-badge{background:rgba(239,68,68,.15);color:#f87171;font-size:11px;font-weight:700;border-radius:4px;padding:2px 5px}
.spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(201,168,76,.3);border-top-color:#c9a84c;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.loading{display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:#6b7280;font-size:14px}
.err-banner{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:14px 20px;color:#f87171;font-size:13px;margin-bottom:20px;display:flex;align-items:center;gap:10px}
.login-page{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0d1117}
.login-box{width:400px;background:#111820;border:1px solid rgba(184,152,90,.2);border-radius:20px;padding:48px 40px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.login-logo{text-align:center;margin-bottom:36px}
.login-arabic{font-family:'Amiri',serif;font-size:32px;color:#c9a84c;line-height:1.2}
.login-sub{font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#4b5563;margin-top:6px}
.login-title{font-size:16px;font-weight:600;color:#e2d9c9;margin-bottom:24px;text-align:center}
.login-fields{display:flex;flex-direction:column;gap:16px}
.login-field{display:flex;flex-direction:column;gap:6px}
.login-btn{background:#c9a84c;color:#0d1117;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Jost',sans-serif;transition:background .2s;margin-top:8px;width:100%}
.login-btn:hover:not(:disabled){background:#dbb95d}
.login-btn:disabled{opacity:.6;cursor:not-allowed}
.login-err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:10px 14px;color:#f87171;font-size:12px;text-align:center}
.login-footer{text-align:center;margin-top:24px;font-size:11px;color:#374151}
.ie-modal{background:#111820;border:1px solid rgba(184,152,90,.2);border-radius:16px;width:500px;box-shadow:0 25px 60px rgba(0,0,0,.5)}
.ie-tabs{display:flex;border-bottom:1px solid rgba(184,152,90,.1)}
.ie-tab{flex:1;padding:14px;text-align:center;font-size:13px;cursor:pointer;color:#6b7280;transition:all .2s;border:none;background:none;font-family:'Jost',sans-serif}
.ie-tab.active{color:#c9a84c;border-bottom:2px solid #c9a84c}
.ie-tab:hover:not(.active){color:#e2d9c9}
.ie-body{padding:24px}
.ie-opt{display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.02);border:1px solid rgba(184,152,90,.1);border-radius:10px;padding:16px 18px;margin-bottom:10px}
.ie-opt-title{font-size:13px;color:#e2d9c9;font-weight:500}
.ie-opt-desc{font-size:11px;color:#6b7280}
.drop-zone{border:2px dashed rgba(184,152,90,.25);border-radius:10px;padding:28px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(184,152,90,.02);margin-top:8px}
.drop-zone:hover{border-color:#c9a84c;background:rgba(201,168,76,.05)}
.imp-preview{background:rgba(255,255,255,.02);border:1px solid rgba(184,152,90,.1);border-radius:10px;padding:14px 18px;margin-top:12px;font-size:12px;color:#9ca3af}
.imp-preview strong{color:#c9a84c}
.imp-type{display:flex;gap:8px;margin-bottom:16px}
.imp-type-btn{flex:1;padding:8px;border-radius:8px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid rgba(184,152,90,.15);color:#6b7280;background:transparent;transition:all .2s;font-family:'Jost',sans-serif}
.imp-type-btn.active{background:rgba(184,152,90,.1);color:#c9a84c;border-color:rgba(201,168,76,.3)}
.lightbox{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:200;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px}
.lightbox img{max-width:90vw;max-height:80vh;border-radius:8px;object-fit:contain}
.lightbox-name{color:#9ca3af;font-size:13px}
.lightbox-close{position:absolute;top:24px;right:28px;background:none;border:none;color:#9ca3af;cursor:pointer;font-size:28px;width:auto}
.lightbox-close:hover{color:#fff}


/* Mumin profile preview */
.preview-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:150;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.preview-box{background:#111820;border:1px solid rgba(184,152,90,.2);border-radius:16px;width:520px;max-height:88vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.5)}
.preview-hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:24px 28px 20px;border-bottom:1px solid rgba(184,152,90,.1)}
.preview-avatar{width:56px;height:56px;border-radius:50%;background:rgba(184,152,90,.15);display:flex;align-items:center;justify-content:center;font-size:22px;color:#c9a84c;border:2px solid rgba(184,152,90,.3);flex-shrink:0}
.preview-name{font-family:'Amiri',serif;font-size:22px;color:#c9a84c;line-height:1.2}
.preview-its{font-size:11px;color:#6b7280;font-family:monospace;margin-top:2px}
.preview-body{padding:20px 28px}
.preview-section{margin-bottom:20px}
.preview-sec-title{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#6b7280;margin-bottom:10px;font-weight:600}
.preview-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.preview-field{background:rgba(255,255,255,.02);border:1px solid rgba(184,152,90,.08);border-radius:8px;padding:10px 14px}
.preview-field-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
.preview-field-val{font-size:13px;color:#e2d9c9}
.preview-family-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.2);border-radius:8px;padding:8px 14px;font-size:13px;color:#c9a84c;margin-top:4px}
/* File viewer */
.file-preview-box{background:#111820;border:1px solid rgba(184,152,90,.2);border-radius:16px;width:680px;max-height:90vh;overflow-y:auto;box-shadow:0 25px 60px rgba(0,0,0,.5)}
.file-preview-hdr{padding:22px 28px 18px;border-bottom:1px solid rgba(184,152,90,.1);display:flex;justify-content:space-between;align-items:flex-start}
.file-preview-title{font-family:'Amiri',serif;font-size:20px;color:#c9a84c;max-width:480px}
.file-preview-body{padding:20px 28px}
.file-meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px}
.file-meta-item{background:rgba(255,255,255,.02);border:1px solid rgba(184,152,90,.08);border-radius:8px;padding:10px 14px}
.file-meta-label{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
.file-meta-val{font-size:13px;color:#e2d9c9}
.att-viewer-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-top:8px}
.att-viewer-item{background:rgba(255,255,255,.02);border:1px solid rgba(184,152,90,.1);border-radius:10px;overflow:hidden;cursor:pointer;transition:all .2s}
.att-viewer-item:hover{border-color:rgba(201,168,76,.3);transform:translateY(-2px)}
.att-viewer-thumb{width:100%;height:100px;object-fit:cover;display:block}
.att-viewer-pdf{width:100%;height:100px;display:flex;align-items:center;justify-content:center;background:rgba(239,68,68,.06);font-size:32px}
.att-viewer-name{padding:8px 10px;font-size:11px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.att-viewer-empty{color:#4b5563;font-size:13px;padding:20px 0;text-align:center}
.clickable-row{cursor:pointer}
.clickable-row:hover td{background:rgba(201,168,76,.05) !important}

/* Global Search */
.gsearch-wrap{position:relative;margin:0 12px 12px}
.gsearch-input{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(184,152,90,.2);color:#e2d9c9;border-radius:10px;padding:9px 14px 9px 36px;font-size:13px;font-family:'Jost',sans-serif;outline:none;transition:border .2s}
.gsearch-input:focus{border-color:rgba(201,168,76,.5)}
.gsearch-icon{position:absolute;left:24px;top:50%;transform:translateY(-50%);color:#6b7280;font-size:14px;pointer-events:none}
.gsearch-results{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#111820;border:1px solid rgba(184,152,90,.2);border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.6);z-index:50;max-height:400px;overflow-y:auto}
.gsearch-section{padding:8px 0}
.gsearch-sec-title{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#4b5563;padding:6px 16px}
.gsearch-item{display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;transition:background .15s}
.gsearch-item:hover{background:rgba(184,152,90,.08)}
.gsearch-item-icon{font-size:16px;flex-shrink:0}
.gsearch-item-main{flex:1;min-width:0}
.gsearch-item-title{font-size:13px;color:#e2d9c9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gsearch-item-sub{font-size:11px;color:#6b7280;margin-top:1px}
.gsearch-empty{padding:20px;text-align:center;color:#4b5563;font-size:13px}
.gsearch-divider{height:1px;background:rgba(184,152,90,.08);margin:4px 0}

/* Reminders */
.reminder-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;display:inline-block}
.reminder-overdue{background:#ef4444}
.reminder-soon{background:#f59e0b}
.reminder-ok{background:#34d399}
.reminders-banner{margin-bottom:20px}
.reminder-card{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.02);border:1px solid rgba(184,152,90,.1);border-radius:10px;padding:12px 16px;margin-bottom:8px;cursor:pointer;transition:all .2s}
.reminder-card:hover{border-color:rgba(201,168,76,.3);background:rgba(184,152,90,.04)}
.reminder-card.overdue{border-color:rgba(239,68,68,.25);background:rgba(239,68,68,.04)}
.reminder-card.soon{border-color:rgba(245,158,11,.25);background:rgba(245,158,11,.04)}
.reminder-info{flex:1;min-width:0}
.reminder-title{font-size:13px;color:#e2d9c9;font-weight:500}
.reminder-meta{font-size:11px;color:#6b7280;margin-top:2px}
.reminder-badge{font-size:11px;padding:2px 8px;border-radius:10px;flex-shrink:0}
.rb-overdue{background:rgba(239,68,68,.15);color:#f87171;border:1px solid rgba(239,68,68,.2)}
.rb-soon{background:rgba(245,158,11,.15);color:#fbbf24;border:1px solid rgba(245,158,11,.2)}

/* User Roles */
.role-admin{background:rgba(201,168,76,.15);color:#c9a84c;border:1px solid rgba(201,168,76,.3)}
.role-editor{background:rgba(96,165,250,.1);color:#60a5fa;border:1px solid rgba(96,165,250,.2)}
.role-viewer{background:rgba(107,114,128,.1);color:#9ca3af;border:1px solid rgba(107,114,128,.2)}
.users-table td,.users-table th{padding:10px 16px}

/* Print */
@media print {
  .sidebar,.toolbar,.act-col,.btn,.modal-overlay,.gsearch-wrap,.user-box,
  .nav,.sb-footer,.cloud-badge,.year-tabs,.page-hdr button{display:none!important}
  .main{margin-left:0!important;padding:10px!important}
  .card{border:1px solid #ccc!important;box-shadow:none!important}
  body{background:#fff!important;color:#000!important}
  table{width:100%!important}
  th,td{color:#000!important;border-bottom:1px solid #eee!important;font-size:11px!important}
  .badge{border:1px solid #999!important;color:#000!important;background:#f0f0f0!important}
  .file-no{color:#000!important}
  .print-header{display:block!important}
}
.print-header{display:none;text-align:center;margin-bottom:20px;border-bottom:2px solid #c9a84c;padding-bottom:12px}
.print-header h2{font-size:20px;margin-bottom:4px}
.print-header p{font-size:12px;color:#666}

  /* Print styles */
  @media print {
    body * { visibility: hidden !important; }
    .print-area, .print-area * { visibility: visible !important; }
    .print-area { position: fixed; inset: 0; background: white; color: black; padding: 32px; z-index: 9999; }
    .no-print { display: none !important; }
  }
  .print-doc { font-family: 'Jost', sans-serif; color: #111; }
  .print-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #c9a84c; padding-bottom: 16px; margin-bottom: 20px; }
  .print-logo { font-family: 'Amiri', serif; font-size: 22px; color: #8a6a1a; }
  .print-logo-sub { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-top: 2px; }
  .print-date { font-size: 11px; color: #888; text-align: right; }
  .print-title { font-size: 20px; font-weight: 700; color: #111; margin-bottom: 4px; }
  .print-subtitle { font-size: 12px; color: #666; margin-bottom: 20px; }
  .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .print-field { border: 1px solid #e5e5e5; border-radius: 6px; padding: 8px 12px; }
  .print-field-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 2px; }
  .print-field-val { font-size: 13px; color: #111; font-weight: 500; }
  .print-section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #8a6a1a; margin: 16px 0 8px; font-weight: 600; border-bottom: 1px solid #f0e6cc; padding-bottom: 4px; }
  .print-att-list { display: flex; flex-direction: column; gap: 6px; }
  .print-att-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #333; background: #fafafa; border: 1px solid #eee; border-radius: 6px; padding: 6px 12px; }
  .print-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid; }
  .print-badge-active { color: #15803d; border-color: #86efac; background: #f0fdf4; }
  .print-badge-closed { color: #6b7280; border-color: #d1d5db; background: #f9fafb; }
  .print-badge-pending { color: #92400e; border-color: #fde68a; background: #fffbeb; }
  .print-footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e5e5; font-size: 10px; color: #aaa; display: flex; justify-content: space-between; }
  .print-family-box { border: 1px solid #f0e6cc; border-radius: 8px; padding: 12px 16px; background: #fffdf7; margin-bottom: 16px; }
  .print-family-name { font-size: 14px; font-weight: 600; color: #8a6a1a; }
  .print-family-role { display: inline-block; font-size: 11px; color: #666; margin-left: 8px; }

@media (max-width: 768px) {
  .layout{flex-direction:column}
  .sidebar{width:100%;height:auto;position:relative;flex-direction:column}
  .nav{display:flex;flex-wrap:wrap;padding:8px;gap:4px}
  .nav-lbl{display:none}
  .nav-item{flex:1;min-width:80px;justify-content:center;text-align:center;padding:8px 6px;font-size:11px}
  .main{margin-left:0 !important;padding:16px}
  .stats-grid{grid-template-columns:1fr 1fr !important}
  .charts-row{grid-template-columns:1fr !important}
  .umoor-grid{grid-template-columns:1fr 1fr !important}
  .fam-grid{grid-template-columns:1fr !important}
  .form-grid{grid-template-columns:1fr !important}
  .form-grp.full{grid-column:span 1 !important}
  .modal{width:95vw !important;max-width:95vw !important;margin:0 10px}
  .ie-modal{width:95vw !important}
  .card-hdr{flex-wrap:wrap;gap:8px}
  table{display:block;overflow-x:auto;white-space:nowrap}
  .toolbar{flex-direction:column;align-items:stretch}
  .toolbar input,.toolbar select{width:100% !important}
  .sb-logo{padding:16px}
  .user-box{margin:4px 8px;padding:8px 12px}
  .sb-footer{display:none}
  .cloud-badge{display:none}
  .page-title{font-size:22px}
  .year-tabs{overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px}
  .year-tab{flex-shrink:0}
  .bar-label{width:120px !important}
  .donut-wrap{flex-direction:column;align-items:center}
}
@media (max-width: 480px) {
  .stats-grid{grid-template-columns:1fr !important}
  .umoor-grid{grid-template-columns:1fr !important}
  .stat-val{font-size:24px}
  .nav-item{min-width:60px;font-size:10px;padding:6px 4px}
}
`;

function Spinner() {
  return <span className="spinner" />;
}

function AttThumb({ url, type }) {
  if (url && type && type.indexOf("image/") === 0) {
    return <div className="att-thumb"><img src={url} alt="" /></div>;
  }
  if (type === "application/pdf") {
    return <div className="att-thumb"><span className="pdf-badge">PDF</span></div>;
  }
  return <div className="att-thumb">📄</div>;
}

function UploadZone({ onFiles, uploading }) {
  const ref = useRef();
  const handle = function(fileList) {
    var arr = Array.from(fileList);
    Promise.all(arr.map(function(f) {
      return fileToBase64(f).then(function(dataUrl) {
        return { name: f.name, size: f.size, type: f.type, dataUrl: dataUrl };
      });
    })).then(onFiles);
  };
  return (
    <div className="upload-zone" onClick={function() { if (!uploading) ref.current.click(); }}>
      <input ref={ref} type="file" accept="image/*,.pdf" multiple style={{ display: "none" }}
        onChange={function(e) { handle(e.target.files); }} />
      <div className="upload-zone-icon">{uploading ? <Spinner /> : "📎"}</div>
      <div className="upload-zone-text">{uploading ? "Uploading…" : "Click or drag files to attach"}</div>
      <div className="upload-zone-sub">JPG, PNG, TIFF, PDF</div>
    </div>
  );
}

function AttList({ atts, onRemove, onView }) {
  if (!atts || !atts.length) return null;
  return (
    <div className="att-list">
      {atts.map(function(a, i) {
        return (
          <div className="att-item" key={i}>
            <AttThumb url={a.url || a.dataUrl} type={a.type} />
            <div className="att-info">
              <div className="att-name">{a.name}</div>
              <div className="att-meta">{fmtBytes(a.size || 0)}{a.url ? " · ☁ saved" : ""}</div>
            </div>
            {(a.url || a.dataUrl) && a.type && a.type.indexOf("image/") === 0 && (
              <button className="att-view" onClick={function() { onView(a); }}>View</button>
            )}
            {onRemove && <button className="att-rm" onClick={function() { onRemove(i); }}>×</button>}
          </div>
        );
      })}
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function doLogin() {
    if (!email || !password) { setError("Please enter email and password."); return; }
    setLoading(true); setError(null);
    sbSignIn(email, password).then(function(data) {
      onLogin(data);
    }).catch(function(e) {
      setError(e.message);
      setLoading(false);
    });
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-arabic">حسيني محلّه</div>
          <div className="login-sub">Husaini Mohallah · Database</div>
        </div>
        <div className="login-title">Sign in to continue</div>
        <div className="login-fields">
          {error && <div className="login-err">{error}</div>}
          <div className="login-field">
            <label>Email</label>
            <input type="text" value={email} onChange={function(e) { setEmail(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter") doLogin(); }}
              placeholder="admin@example.com" autoFocus />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input type="password" value={password} onChange={function(e) { setPassword(e.target.value); }}
              onKeyDown={function(e) { if (e.key === "Enter") doLogin(); }}
              placeholder="••••••••" />
          </div>
          <button className="login-btn" onClick={doLogin} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </div>
        <div className="login-footer">Husaini Mohallah © 2025</div>
      </div>
    </div>
  );
}

function IEModal({ onClose, muminData, filesData, onImportMumin, onImportFiles, importing }) {
  const [tab, setTab] = useState("export");
  const [importType, setImportType] = useState("mumin");
  const [preview, setPreview] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const ref = useRef();

  function handleFile(file) {
    var name = file.name.toLowerCase();
    if (name.indexOf(".xls") >= 0) {
      // Parse XLS/XLSX using FileReader as binary, extract via simple XML parse
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var txt = e.target.result;
          // Try SpreadsheetML XML format first
          if (txt.indexOf('<Row>') >= 0 || txt.indexOf('<ss:Row') >= 0) {
            var rowMatches = txt.match(/<Row[^>]*>([\s\S]*?)<\/Row>/g) || [];
            var allRows = rowMatches.map(function(row) {
              var cells = row.match(/<Data[^>]*>([\s\S]*?)<\/Data>/g) || [];
              return cells.map(function(c) { return c.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'); });
            });
            if (allRows.length < 2) { setPreview({ error: "No data rows found in XLS." }); return; }
            var headers = allRows[0];
            var rows = allRows.slice(1).map(function(cells) {
              var obj = {};
              headers.forEach(function(h,i) { obj[h] = cells[i] || ''; });
              return obj;
            });
            setParsedRows(rows);
            setPreview({ name: file.name, count: rows.length });
          } else {
            // Try parsing as CSV (some XLS files are tab-separated)
            var rows = parseCSV(txt.replace(/	/g, ','));
            setParsedRows(rows);
            setPreview({ name: file.name, count: rows.length });
          }
        } catch(err) {
          setPreview({ error: "Could not parse XLS. Try saving as CSV from Excel first." });
        }
      };
      reader.readAsText(file);
    } else {
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var rows = name.indexOf(".json") >= 0
            ? JSON.parse(e.target.result)
            : parseCSV(e.target.result);
          setParsedRows(rows);
          setPreview({ name: file.name, count: rows.length });
        } catch(err) {
          setPreview({ error: "Could not parse file." });
        }
      };
      reader.readAsText(file);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ie-modal" onClick={function(e) { e.stopPropagation(); }}>
        <div className="modal-hdr">
          <div className="modal-title">Import / Export</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ie-tabs">
          <button className={"ie-tab" + (tab === "export" ? " active" : "")} onClick={function() { setTab("export"); }}>⬇ Export</button>
          <button className={"ie-tab" + (tab === "import" ? " active" : "")} onClick={function() { setTab("import"); }}>⬆ Import</button>
        </div>
        <div className="ie-body">
          {tab === "export" && (
            <div>
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Download your data as CSV or JSON.</p>
              <div className="ie-opt">
                <div>
                  <div className="ie-opt-title">👤 Mumin Data</div>
                  <div className="ie-opt-desc">{muminData.length} records</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn btn-ghost btn-sm" onClick={function() { downloadBlob(toCSV(muminData, MUMIN_COLS), "mumin_data.csv", "text/csv"); }}>CSV</button>
                  <button className="btn btn-ghost btn-sm" onClick={function() { toXLS(muminData, MUMIN_COLS, "mumin_data"); }}>XLS</button>
                  <button className="btn btn-ghost btn-sm" onClick={function() { downloadBlob(JSON.stringify(muminData, null, 2), "mumin_data.json", "application/json"); }}>JSON</button>
                </div>
              </div>
              <div className="ie-opt">
                <div>
                  <div className="ie-opt-title">🗂 Umoor Files</div>
                  <div className="ie-opt-desc">{filesData.length} records</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn btn-ghost btn-sm" onClick={function() { downloadBlob(toCSV(filesData, FILE_COLS), "umoor_files.csv", "text/csv"); }}>CSV</button>
                  <button className="btn btn-ghost btn-sm" onClick={function() { toXLS(filesData, FILE_COLS, "umoor_files"); }}>XLS</button>
                  <button className="btn btn-ghost btn-sm" onClick={function() { downloadBlob(JSON.stringify(filesData, null, 2), "umoor_files.json", "application/json"); }}>JSON</button>
                </div>
              </div>
            </div>
          )}
          {tab === "import" && (
            <div>
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>New rows are added — existing records are not deleted.</p>
              <div className="imp-type">
                <button className={"imp-type-btn" + (importType === "mumin" ? " active" : "")} onClick={function() { setImportType("mumin"); setPreview(null); setParsedRows([]); }}>👤 Mumin Data</button>
                <button className={"imp-type-btn" + (importType === "files" ? " active" : "")} onClick={function() { setImportType("files"); setPreview(null); setParsedRows([]); }}>🗂 Umoor Files</button>
              </div>
              <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
                Columns: <span style={{ color: "#c9a84c", fontFamily: "monospace" }}>{(importType === "mumin" ? MUMIN_COLS : FILE_COLS).join(", ")}</span>
              </p>
              <input ref={ref} type="file" accept=".csv,.json,.xls,.xlsx" style={{ display: "none" }} onChange={function(e) { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
              <div className="drop-zone" onClick={function() { ref.current.click(); }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>📂</div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>Click to choose file</div>
                <div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>CSV, JSON, XLS supported</div>
              </div>
              {preview && !preview.error && (
                <div className="imp-preview"><strong>{preview.name}</strong> — <strong>{preview.count} rows</strong> ready to import.</div>
              )}
              {preview && preview.error && (
                <div className="imp-preview" style={{ color: "#f87171" }}>⚠ {preview.error}</div>
              )}
              {parsedRows.length > 0 && (
                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-primary" disabled={importing}
                    onClick={function() { importType === "mumin" ? onImportMumin(parsedRows) : onImportFiles(parsedRows); }}>
                    {importing ? <span><Spinner /> Importing…</span> : "Import " + parsedRows.length + " rows ☁"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Print helpers ─────────────────────────────────────────────────
function printMumin(m, family, atts) {
  var statusClass = (m.status||"active").toLowerCase();
  var html = '<div class="print-doc">';
  html += '<div class="print-header">';
  html += '<div><div class="print-logo">\u062D\u0633\u064A\u0646\u064A \u0645\u062D\u0644\u0651\u0647</div><div class="print-logo-sub">Husaini Mohallah</div></div>';
  html += '<div class="print-date">Mumin Record<br/>' + new Date().toLocaleDateString("en-GB", {day:"2-digit",month:"long",year:"numeric"}) + '</div>';
  html += '</div>';
  html += '<div class="print-title">' + (m.name||"") + '</div>';
  html += '<div class="print-subtitle">ITS: ' + (m.its_number||"") + ' &nbsp;|&nbsp; <span class="print-badge print-badge-' + statusClass + '">' + (m.status||"") + '</span></div>';
  html += '<div class="print-section-title">Personal Details</div>';
  html += '<div class="print-grid">';
  html += '<div class="print-field"><div class="print-field-label">Age</div><div class="print-field-val">' + (m.age||"—") + '</div></div>';
  html += '<div class="print-field"><div class="print-field-label">Gender</div><div class="print-field-val">' + (m.gender||"—") + '</div></div>';
  html += '<div class="print-field"><div class="print-field-label">Phone</div><div class="print-field-val">' + (m.phone||"—") + '</div></div>';
  html += '<div class="print-field"><div class="print-field-label">Email</div><div class="print-field-val">' + (m.email||"—") + '</div></div>';
  html += '<div class="print-field" style="grid-column:span 2"><div class="print-field-label">Address</div><div class="print-field-val">' + (m.address||"—") + '</div></div>';
  html += '</div>';
  if (family && family.fam) {
    html += '<div class="print-section-title">Family</div>';
    html += '<div class="print-family-box">';
    html += '<div class="print-family-name">' + family.fam.family_name + '<span class="print-family-role">(' + (family.role||"") + ')</span></div>';
    if (family.fam.address) html += '<div style="font-size:12px;color:#666;margin-top:4px">' + family.fam.address + '</div>';
    html += '</div>';
  }
  html += '<div class="print-footer"><span>Husaini Mohallah Database</span><span>Printed ' + new Date().toLocaleString() + '</span></div>';
  html += '</div>';
  var w = window.open("","_blank","width=700,height=900");
  w.document.write('<html><head><title>Mumin — ' + (m.name||"") + '</title>');
  w.document.write('<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Jost:wght@400;500;600&display=swap" rel="stylesheet">');
  w.document.write('<style>body{margin:32px;font-family:Jost,sans-serif;background:#fff;color:#111}' + document.querySelector('style') ? '' : '' );
  w.document.write('.print-doc{font-family:Jost,sans-serif}.print-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #c9a84c;padding-bottom:16px;margin-bottom:20px}.print-logo{font-family:Amiri,serif;font-size:22px;color:#8a6a1a}.print-logo-sub{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;margin-top:2px}.print-date{font-size:11px;color:#888;text-align:right}.print-title{font-size:22px;font-weight:700;color:#111;margin-bottom:4px}.print-subtitle{font-size:12px;color:#666;margin-bottom:20px}.print-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}.print-field{border:1px solid #e5e5e5;border-radius:6px;padding:8px 12px}.print-field-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:2px}.print-field-val{font-size:13px;color:#111;font-weight:500}.print-section-title{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#8a6a1a;margin:16px 0 8px;font-weight:600;border-bottom:1px solid #f0e6cc;padding-bottom:4px}.print-family-box{border:1px solid #f0e6cc;border-radius:8px;padding:12px 16px;background:#fffdf7;margin-bottom:16px}.print-family-name{font-size:14px;font-weight:600;color:#8a6a1a}.print-family-role{display:inline-block;font-size:11px;color:#666;margin-left:8px}.print-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid}.print-badge-active{color:#15803d;border-color:#86efac;background:#f0fdf4}.print-badge-closed{color:#6b7280;border-color:#d1d5db;background:#f9fafb}.print-badge-pending{color:#92400e;border-color:#fde68a;background:#fffbeb}.print-footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e5e5;font-size:10px;color:#aaa;display:flex;justify-content:space-between}</style>');
  w.document.write('</head><body>');
  w.document.write(html);
  w.document.write('<script>window.onload=function(){window.print();}<\/script>');
  w.document.write('</body></html>');
  w.document.close();
}

function printFile(f, atts) {
  var statusClass = (f.status||"active").toLowerCase();
  var html = '<div class="print-doc">';
  html += '<div class="print-header">';
  html += '<div><div class="print-logo">\u062D\u0633\u064A\u0646\u064A \u0645\u062D\u0644\u0651\u0647</div><div class="print-logo-sub">Husaini Mohallah</div></div>';
  html += '<div class="print-date">Umoor File<br/>' + new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"}) + '</div>';
  html += '</div>';
  html += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#8a6a1a;margin-bottom:6px">' + (f.umoor_type||"") + '</div>';
  html += '<div class="print-title">' + (f.title||"") + '</div>';
  html += '<div class="print-subtitle"><span class="print-badge print-badge-' + statusClass + '">' + (f.status||"") + '</span></div>';
  html += '<div class="print-section-title">File Details</div>';
  html += '<div class="print-grid">';
  html += '<div class="print-field"><div class="print-field-label">File No.</div><div class="print-field-val" style="font-family:monospace;color:#8a6a1a">' + (f.file_no||"—") + '</div></div>';
  html += '<div class="print-field"><div class="print-field-label">Year</div><div class="print-field-val">' + (f.year||"—") + '</div></div>';
  html += '<div class="print-field"><div class="print-field-label">Date</div><div class="print-field-val">' + (f.date||"—") + '</div></div>';
  html += '<div class="print-field"><div class="print-field-label">Status</div><div class="print-field-val">' + (f.status||"—") + '</div></div>';
  html += '</div>';
  if (f.description) {
    html += '<div class="print-section-title">Description</div>';
    html += '<div style="border:1px solid #e5e5e5;border-radius:6px;padding:12px 16px;font-size:13px;color:#333;line-height:1.7;margin-bottom:16px">' + f.description + '</div>';
  }
  if (f.due_date) {
    html += '<div class="print-section-title">Due Date</div>';
    html += '<div style="border:1px solid #fde68a;border-radius:6px;padding:10px 16px;font-size:13px;color:#92400e;background:#fffbeb;margin-bottom:16px">\u23F0 ' + f.due_date + '</div>';
  }
  if (atts && atts.length > 0) {
    html += '<div class="print-section-title">Attachments (' + atts.length + ')</div>';
    html += '<div class="print-att-list">';
    atts.forEach(function(att) {
      var icon = att.type && att.type.startsWith("image/") ? "\uD83D\uDDBC" : att.type === "application/pdf" ? "\uD83D\uDCC4" : "\uD83D\uDCCE";
      html += '<div class="print-att-item">' + icon + ' ' + att.name + '</div>';
    });
    html += '</div>';
  }
  html += '<div class="print-footer"><span>Husaini Mohallah Database</span><span>Printed ' + new Date().toLocaleString() + '</span></div>';
  html += '</div>';
  var w = window.open("","_blank","width=700,height=900");
  w.document.write('<html><head><title>File — ' + (f.title||"") + '</title>');
  w.document.write('<style>body{margin:32px;font-family:Arial,sans-serif;background:#fff;color:#111}.print-doc{font-family:Arial,sans-serif}.print-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #c9a84c;padding-bottom:16px;margin-bottom:20px}.print-logo{font-size:20px;color:#8a6a1a;font-weight:700}.print-logo-sub{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;margin-top:2px}.print-date{font-size:11px;color:#888;text-align:right}.print-title{font-size:20px;font-weight:700;color:#111;margin-bottom:8px}.print-subtitle{margin-bottom:20px}.print-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}.print-field{border:1px solid #e5e5e5;border-radius:6px;padding:8px 12px}.print-field-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:2px}.print-field-val{font-size:13px;color:#111;font-weight:500}.print-section-title{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#8a6a1a;margin:16px 0 8px;font-weight:600;border-bottom:1px solid #f0e6cc;padding-bottom:4px}.print-att-list{display:flex;flex-direction:column;gap:6px}.print-att-item{display:flex;align-items:center;gap:8px;font-size:12px;color:#333;background:#fafafa;border:1px solid #eee;border-radius:6px;padding:6px 12px}.print-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid}.print-badge-active{color:#15803d;border-color:#86efac;background:#f0fdf4}.print-badge-closed{color:#6b7280;border-color:#d1d5db;background:#f9fafb}.print-badge-pending{color:#92400e;border-color:#fde68a;background:#fffbeb}.print-footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e5e5;font-size:10px;color:#aaa;display:flex;justify-content:space-between}</style>');
  w.document.write('</head><body>');
  w.document.write(html);
  w.document.write('<script>window.onload=function(){window.print();}<\/script>');
  w.document.write('</body></html>');
  w.document.close();
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [muminData, setMuminData] = useState([]);
  const [filesData, setFilesData] = useState([]);
  const [attsData, setAttsData] = useState([]);
  const [familiesData, setFamiliesData] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [famModal, setFamModal] = useState(null);
  const [famForm, setFamForm] = useState({});
  const [famMemberForm, setFamMemberForm] = useState({ its_number: "", role: "Head" });
  const [gSearch, setGSearch] = useState("");
  const [gSearchOpen, setGSearchOpen] = useState(false);
  const [userRole, setUserRole] = useState("admin"); // admin|editor|viewer

  // Role helpers — computed from userRole
  var canEdit   = userRole === "admin" || userRole === "editor";
  var canDelete = userRole === "admin";
  var isAdmin   = userRole === "admin";
  const [usersData, setUsersData] = useState([]);
  const [printTarget, setPrintTarget] = useState(null); // {type:'mumin'|'files'|'umoor', umoor:''}
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [selYear, setSelYear] = useState(2024);
  const [selUmoor, setSelUmoor] = useState(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [formAtts, setFormAtts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [muminPreview, setMuminPreview] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [ieModal, setIeModal] = useState(false);
  const [importing, setImporting] = useState(false);

  function showToast(msg, type) {
    setToast({ msg: msg, type: type || "success" });
    setTimeout(function() { setToast(null); }, 3500);
  }

  async function loadAll() {
    setLoading(true); setDbError(null);
    try {
      var results = await Promise.all([
        sbGet("mumin_data", "order=id.asc"),
        sbGet("umoor_files", "order=id.desc"),
        sbGet("attachments", "order=id.asc"),
        sbGet("families", "order=id.asc"),
        sbGet("family_members", "order=id.asc"),
      ]);
      setMuminData(results[0] || []);
      setFilesData(results[1] || []);
      setAttsData(results[2] || []);
      setFamiliesData(results[3] || []);
      setFamilyMembers(results[4] || []);
    } catch(e) {
      setDbError(e.message);
    }
    setLoading(false);
  }

  useEffect(function() {
    var stored = null;
    try { stored = localStorage.getItem("hm_session"); } catch(e) {}
    if (stored) {
      try {
        var s = JSON.parse(stored);
        sbGetUser(s.access_token).then(function(user) {
          if (user && user.id) {
                    setSession(s);
            loadAll();
          } else {
            try { localStorage.removeItem("hm_session"); } catch(e) {}
          }
          setAuthLoading(false);
        }).catch(function() {
          try { localStorage.removeItem("hm_session"); } catch(e) {}
          setAuthLoading(false);
        });
      } catch(e) {
        try { localStorage.removeItem("hm_session"); } catch(e2) {}
        setAuthLoading(false);
      }
    } else {
      setAuthLoading(false);
    }
  }, []);

  function handleLogin(data) {
    setSession(data);
    try { localStorage.setItem("hm_session", JSON.stringify(data)); } catch(e) {}
    loadAll();
  }

  function handleSignOut() {
    sbSignOut(session && session.access_token);
    setSession(null);
    setMuminData([]); setFilesData([]); setAttsData([]);
    try { localStorage.removeItem("hm_session"); } catch(e) {}
  }

  function getFileAtts(fileId) {
    return attsData.filter(function(a) { return a.file_id === fileId; });
  }

  function openModal(type, mode, record) {
    setForm(record ? Object.assign({}, record) : { year: selYear, status: "Active" });
    setFormAtts(type === "file" && record ? getFileAtts(record.id) : []);
    setModal({ type: type, mode: mode, record: record || null });
  }
  function closeModal() { setModal(null); setForm({}); setFormAtts([]); }

  async function saveMumin() {
    setSaving(true);
    try {
      var payload = {
        its_number: form.its_number || "",
        name: form.name || "",
        age: form.age ? Number(form.age) : null,
        gender: form.gender || "Male",
        phone: form.phone || "",
        email: form.email || "",
        address: form.address || "",
        status: form.status || "Active",
      };
      if (modal.mode === "add") await sbInsert("mumin_data", payload);
      else await sbUpdate("mumin_data", form.id, payload);
      showToast(modal.mode === "add" ? "Mumin record saved ☁" : "Record updated");
      await loadAll(); closeModal();
    } catch(e) { showToast("Error: " + e.message, "error"); }
    setSaving(false);
  }

  async function saveFile() {
    setSaving(true);
    try {
      var fileNo = form.file_no || ("HM-" + form.year + "-" + String(Date.now()).slice(-3));
      var payload = {
        file_no: fileNo,
        umoor_type: form.umoor_type || "",
        year: Number(form.year) || 2024,
        title: form.title || "",
        description: form.description || "",
        status: form.status || "Active",
        date: form.date || "",
        due_date: form.due_date || null,
      };
      var fileId;
      if (modal.mode === "add") {
        var result = await sbInsert("umoor_files", payload);
        fileId = Array.isArray(result) ? result[0].id : result.id;
      } else {
        fileId = form.id;
        await sbUpdate("umoor_files", fileId, payload);
        var existingIds = attsData.filter(function(a) { return a.file_id === fileId; }).map(function(a) { return a.id; });
        var keptIds = formAtts.filter(function(a) { return a.id; }).map(function(a) { return a.id; });
        for (var i = 0; i < existingIds.length; i++) {
          if (keptIds.indexOf(existingIds[i]) < 0) await sbDelete("attachments", existingIds[i]);
        }
      }
      var newAtts = formAtts.filter(function(a) { return !a.id; });
      if (newAtts.length > 0) {
        setUploading(true);
        for (var j = 0; j < newAtts.length; j++) {
          var att = newAtts[j];
          var ext = att.name.split(".").pop();
          var path = "files/" + fileId + "/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;
          var url = await uploadStorage(att, path);
          await sbInsert("attachments", { file_id: fileId, name: att.name, size: att.size, type: att.type, url: url });
        }
        setUploading(false);
      }
      showToast(modal.mode === "add" ? "File saved ☁" : "File updated");
      await loadAll(); closeModal();
    } catch(e) { showToast("Error: " + e.message, "error"); setUploading(false); }
    setSaving(false);
  }

  async function deleteRecord(type, id) {
    try {
      await sbDelete(type === "mumin" ? "mumin_data" : "umoor_files", id);
      showToast("Deleted"); await loadAll();
    } catch(e) { showToast("Error: " + e.message, "error"); }
  }

  async function handleImportMumin(rows) {
    setImporting(true);
    var ok = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      try {
        await sbInsert("mumin_data", {
          its_number: r.its_number || "", name: r.name || "",
          age: r.age ? Number(r.age) : null, gender: r.gender || "Male",
          phone: r.phone || "", email: r.email || "",
          address: r.address || "", status: r.status || "Active",
        });
        ok++;
      } catch(e) {}
    }
    await loadAll(); setImporting(false); setIeModal(false);
    showToast("Imported " + ok + " of " + rows.length + " records ☁");
  }

  async function handleImportFiles(rows) {
    setImporting(true);
    var ok = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      try {
        await sbInsert("umoor_files", {
          file_no: r.file_no || ("HM-" + r.year + "-" + String(Date.now()).slice(-3)),
          umoor_type: r.umoor_type || "", year: Number(r.year) || 2024,
          title: r.title || "", description: r.description || "",
          status: r.status || "Active", date: r.date || "",
        });
        ok++;
      } catch(e) {}
    }
    await loadAll(); setImporting(false); setIeModal(false);
    showToast("Imported " + ok + " of " + rows.length + " records ☁");
  }

  var filteredMumin = muminData.filter(function(m) {
    return (m.name || "").toLowerCase().indexOf(search.toLowerCase()) >= 0
      || (m.its_number || "").indexOf(search) >= 0;
  });
  var filteredFiles = filesData.filter(function(f) {
    return (selYear ? f.year === selYear : true)
      && (selUmoor ? f.umoor_type === selUmoor : true)
      && (search ? (f.title || "").toLowerCase().indexOf(search.toLowerCase()) >= 0
          || (f.file_no || "").indexOf(search) >= 0 : true);
  });
  var umoorStats = UMOOR_TYPES.map(function(u, i) {
    return {
      name: u, num: i + 1,
      count: filesData.filter(function(f) { return f.umoor_type === u && f.year === selYear; }).length,
    };
  });

  if (authLoading) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1117", color: "#6b7280", gap: 12, fontSize: 14 }}>
          <Spinner /> Loading…
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <style>{CSS}</style>
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="layout">
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="sb-arabic">حسيني محلّه</div>
            <div className="sb-sub">Husaini Mohallah · Database</div>
            <div className="cloud-badge">☁ Supabase Cloud</div>
          </div>
          <nav className="nav">
            <div className="nav-lbl">Main</div>
            {[
              { id: "dashboard", icon: "◈", label: "Dashboard" },
              { id: "files", icon: "🗂", label: "Umoor Files" },
              { id: "mumin", icon: "👤", label: "Mumin Data" },
              { id: "families", icon: "🏠", label: "Families" },
              { id: "reports", icon: "📄", label: "Reports" },
              isAdmin ? { id: "users", icon: "👥", label: "Users" } : null,
            ].filter(Boolean).map(function(n) {
              return (
                <div key={n.id} className={"nav-item" + (page === n.id ? " active" : "")}
                  onClick={function() { setPage(n.id); setSearch(""); setSelUmoor(null); }}>
                  <span>{n.icon}</span> {n.label}
                </div>
              );
            })}
            <div className="nav-item" style={{ color: "#c9a84c", borderColor: "rgba(201,168,76,.15)", marginTop: 4 }}
              onClick={function() { setIeModal(true); }}>
              <span>⇅</span> Import / Export
            </div>
            <div style={{ marginTop: 8, position: "relative" }} className="gsearch-wrap">
              <span className="gsearch-icon">🔍</span>
              <input className="gsearch-input" placeholder="Search everything..."
                value={gSearch}
                onChange={function(e) { setGSearch(e.target.value); setGSearchOpen(e.target.value.length > 0); }}
                onFocus={function() { if (gSearch.length > 0) setGSearchOpen(true); }}
                onBlur={function() { setTimeout(function() { setGSearchOpen(false); }, 200); }}
              />
              {gSearchOpen && (function() {
                var q = gSearch.toLowerCase();
                var mRes = muminData.filter(function(m) { return (m.name||"").toLowerCase().includes(q) || (m.its_number||"").includes(q); }).slice(0,5);
                var fRes = filesData.filter(function(f) { return (f.title||"").toLowerCase().includes(q) || (f.file_no||"").toLowerCase().includes(q); }).slice(0,5);
                var famRes = familiesData.filter(function(f) { return (f.family_name||"").toLowerCase().includes(q); }).slice(0,3);
                var total = mRes.length + fRes.length + famRes.length;
                return (
                  <div className="gsearch-results">
                    {total === 0 && <div className="gsearch-empty">No results for "{gSearch}"</div>}
                    {mRes.length > 0 && (
                      <div className="gsearch-section">
                        <div className="gsearch-sec-title">Mumin</div>
                        {mRes.map(function(m) { return (
                          <div className="gsearch-item" key={m.id} onClick={function() { setMuminPreview(m); setGSearch(""); setGSearchOpen(false); }}>
                            <span className="gsearch-item-icon">👤</span>
                            <div className="gsearch-item-main">
                              <div className="gsearch-item-title">{m.name}</div>
                              <div className="gsearch-item-sub">ITS: {m.its_number} · {m.gender}</div>
                            </div>
                          </div>
                        ); })}
                      </div>
                    )}
                    {fRes.length > 0 && mRes.length > 0 && <div className="gsearch-divider" />}
                    {fRes.length > 0 && (
                      <div className="gsearch-section">
                        <div className="gsearch-sec-title">Files</div>
                        {fRes.map(function(f) { return (
                          <div className="gsearch-item" key={f.id} onClick={function() { setFilePreview(f); setGSearch(""); setGSearchOpen(false); }}>
                            <span className="gsearch-item-icon">🗂</span>
                            <div className="gsearch-item-main">
                              <div className="gsearch-item-title">{f.title}</div>
                              <div className="gsearch-item-sub">{f.file_no} · {f.umoor_type}</div>
                            </div>
                          </div>
                        ); })}
                      </div>
                    )}
                    {famRes.length > 0 && (fRes.length > 0 || mRes.length > 0) && <div className="gsearch-divider" />}
                    {famRes.length > 0 && (
                      <div className="gsearch-section">
                        <div className="gsearch-sec-title">Families</div>
                        {famRes.map(function(f) { return (
                          <div className="gsearch-item" key={f.id} onClick={function() { setPage("families"); setGSearch(""); setGSearchOpen(false); }}>
                            <span className="gsearch-item-icon">🏠</span>
                            <div className="gsearch-item-main">
                              <div className="gsearch-item-title">{f.family_name}</div>
                              <div className="gsearch-item-sub">{f.address||"No address"}</div>
                            </div>
                          </div>
                        ); })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </nav>
          <div className="user-box">
            <div className="user-role">● Signed In</div>
            <div className="user-email">{session && session.user && session.user.email}</div>
            <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
          </div>
          <div className="sb-footer">Husaini Mohallah © 2025</div>
        </aside>

        <main className="main">
          {dbError && (
            <div className="err-banner">⚠ {dbError}
              <button className="btn btn-ghost btn-sm" onClick={loadAll} style={{ marginLeft: 8 }}>Retry</button>
            </div>
          )}

          {page === "dashboard" && (
            <div>
              <div className="page-hdr">
                <div className="page-title">Dashboard</div>
                <div className="page-sub">Live data from Supabase</div>
              </div>
              {loading ? <div className="loading"><Spinner /> Loading…</div> : (
                <div>
                  <div className="stats-grid">
                    {[
                      { label: "Total Mumineen", value: muminData.length, desc: "Registered members" },
                      { label: "Total Files", value: filesData.length, desc: "All years combined" },
                      { label: "Active Files", value: filesData.filter(function(f) { return f.status === "Active"; }).length, desc: "Currently open" },
                      { label: "Attachments", value: attsData.length, desc: "Scans and photos" },
                    ].map(function(s) {
                      return (
                        <div className="stat-card" key={s.label}>
                          <div className="stat-lbl">{s.label}</div>
                          <div className="stat-val">{s.value}</div>
                          <div className="stat-desc">{s.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="year-tabs">
                    {YEARS.map(function(y) {
                      return <button key={y} className={"year-tab" + (selYear === y ? " active" : "")} onClick={function() { setSelYear(y); }}>{y}</button>;
                    })}
                  </div>
                  <div className="card">
                    <div className="card-hdr">
                      <span className="card-title">12 Umoor — {selYear}</span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{filesData.filter(function(f) { return f.year === selYear; }).length} files</span>
                    </div>
                    <div style={{ padding: 20 }}>
                      <div className="umoor-grid">
                        {umoorStats.map(function(u) {
                          return (
                            <div key={u.name} className="umoor-card" onClick={function() { setSelUmoor(u.name); setPage("files"); }}>
                              <div className="umoor-num">File {String(u.num).padStart(2, "0")}</div>
                              <div className="umoor-name">{u.name}</div>
                              <div className="umoor-count">{u.count} file{u.count !== 1 ? "s" : ""}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ── Charts ── */}
                  <div className="charts-row">
                    <div className="chart-card">
                      <div className="chart-title">Files per Umoor — {selYear}</div>
                      <div className="bar-wrap">
                        {(function() {
                          var max = Math.max(1, ...umoorStats.map(function(u) { return u.count; }));
                          return umoorStats.map(function(u) {
                            return (
                              <div className="bar-row" key={u.name}>
                                <div className="bar-label" title={u.name}>{u.name.split(" (")[0]}</div>
                                <div className="bar-track">
                                  <div className="bar-fill" style={{ width: (u.count / max * 100) + "%" }} />
                                </div>
                                <div className="bar-val">{u.count}</div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    <div className="chart-card">
                      <div className="chart-title">File Status Breakdown</div>
                      {(function() {
                        var yr = filesData.filter(function(f) { return f.year === selYear; });
                        var active = yr.filter(function(f) { return f.status === "Active"; }).length;
                        var closed = yr.filter(function(f) { return f.status === "Closed"; }).length;
                        var pending = yr.filter(function(f) { return f.status === "Pending"; }).length;
                        var total = yr.length || 1;
                        var segments = [
                          { label: "Active", count: active, color: "#34d399" },
                          { label: "Closed", count: closed, color: "#6b7280" },
                          { label: "Pending", count: pending, color: "#fbbf24" },
                        ];
                        var r = 54; var cx = 70; var cy = 70; var circ = 2 * Math.PI * r;
                        var offset = 0;
                        return (
                          <div className="donut-wrap">
                            <svg width="140" height="140" style={{ flexShrink: 0 }}>
                              <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="18" />
                              {segments.map(function(s) {
                                var dash = (s.count / total) * circ;
                                var gap = circ - dash;
                                var el = (
                                  <circle key={s.label} cx={cx} cy={cy} r={r} fill="none"
                                    stroke={s.color} strokeWidth="18"
                                    strokeDasharray={dash + " " + gap}
                                    strokeDashoffset={-offset}
                                    style={{ transform: "rotate(-90deg)", transformOrigin: "70px 70px" }} />
                                );
                                offset += dash;
                                return el;
                              })}
                              <text x={cx} y={cy-6} textAnchor="middle" fill="#e2d9c9" fontSize="18" fontWeight="600">{total}</text>
                              <text x={cx} y={cy+12} textAnchor="middle" fill="#6b7280" fontSize="10">files</text>
                            </svg>
                            <div className="donut-legend">
                              {segments.map(function(s) {
                                return (
                                  <div className="legend-item" key={s.label}>
                                    <div className="legend-dot" style={{ background: s.color }} />
                                    <span>{s.label}</span>
                                    <span style={{ marginLeft: "auto", color: "#e2d9c9", fontWeight: 600 }}>{s.count}</span>
                                  </div>
                                );
                              })}
                              <div className="legend-item" style={{ marginTop: 8, borderTop: "1px solid rgba(184,152,90,0.1)", paddingTop: 8 }}>
                                <span>Members</span>
                                <span style={{ marginLeft: "auto", color: "#c9a84c", fontWeight: 600 }}>{muminData.length}</span>
                              </div>
                              <div className="legend-item">
                                <span>Families</span>
                                <span style={{ marginLeft: "auto", color: "#c9a84c", fontWeight: 600 }}>{familiesData.length}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {page === "families" && (
            <div>
              <div className="page-hdr" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div className="page-title">Families</div>
                  <div className="page-sub">Household groups linking Mumin members together</div>
                </div>
                <button className="btn btn-primary" onClick={function() { setFamForm({}); setFamModal({ mode: "add" }); }}>+ New Family</button>
              </div>
              {loading ? <div className="loading"><Spinner /> Loading…</div> : (
                <div>
                  {familiesData.length === 0 ? (
                    <div className="card">
                      <div className="empty" style={{ padding: 60 }}>
                        <div className="empty-icon">🏠</div>
                        <div>No families yet. Create one and link Mumin members to it.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="fam-grid">
                      {familiesData.map(function(fam) {
                        var members = familyMembers.filter(function(m) { return m.family_id === fam.id; });
                        var getMumin = function(its) { return muminData.find(function(m) { return m.its_number === its; }); };
                        return (
                          <div className="fam-card" key={fam.id}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <div className="fam-name">{fam.family_name}</div>
                                <div className="fam-meta">{members.length} member{members.length !== 1 ? "s" : ""} · {fam.address || "No address"}</div>
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button className="btn btn-ghost btn-sm" onClick={function(e) { e.stopPropagation(); setFamForm(fam); setFamModal({ mode: "edit", record: fam }); }}>Edit</button>
                                <button className="btn btn-danger" onClick={function(e) { e.stopPropagation(); sbDelete("families", fam.id).then(loadAll); }}>Del</button>
                              </div>
                            </div>
                            <div className="fam-members">
                              {members.slice(0, 4).map(function(mem) {
                                var mumin = getMumin(mem.its_number);
                                return (
                                  <div className="fam-member-row" key={mem.id}>
                                    <span className="fam-member-name">{mumin ? mumin.name : mem.its_number}</span>
                                    <span className={"fam-member-role role-" + mem.role.toLowerCase()}>{mem.role}</span>
                                  </div>
                                );
                              })}
                              {members.length > 4 && <div style={{ fontSize: 11, color: "#4b5563", paddingTop: 4 }}>+{members.length - 4} more…</div>}
                            </div>
                            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, width: "100%" }}
                              onClick={function() { setFamModal({ mode: "view", record: fam }); }}>
                              Manage Members
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


          {page === "reports" && (
            <div>
              <div className="page-hdr" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                <div><div className="page-title">Reports</div><div className="page-sub">Print and export formatted reports</div></div>
              </div>
              <div className="print-header" id="print-header">
                <h2>Husaini Mohallah — {printTarget && printTarget.label}</h2>
                <p>Generated: {new Date().toLocaleDateString()}</p>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:28}}>
                {[
                  {id:"mumin", icon:"👤", label:"Mumin Directory", desc:"Full list of all registered members", data:muminData.length + " members"},
                  {id:"files_all", icon:"🗂", label:"All Umoor Files", desc:"Complete file list across all departments", data:filesData.length + " files"},
                  {id:"reminders", icon:"⏰", label:"Reminders Report", desc:"All files with due dates — overdue and upcoming", data:filesData.filter(function(f){return f.due_date;}).length + " files with dates"},
                  {id:"families", icon:"🏠", label:"Family Directory", desc:"All families and their members", data:familiesData.length + " families"},
                  {id:"age_groups", icon:"📊", label:"Age Group Summary", desc:"Members broken down by age group", data:muminData.length + " members"},
                ].map(function(r) { return (
                  <div key={r.id} className="umoor-card" style={{cursor:"pointer"}} onClick={function(){
                    setPrintTarget(r);
                    setTimeout(function(){ window.print(); }, 300);
                  }}>
                    <div style={{fontSize:28,marginBottom:8}}>{r.icon}</div>
                    <div className="umoor-name" style={{fontSize:14,marginBottom:4}}>{r.label}</div>
                    <div className="umoor-count">{r.desc}</div>
                    <div style={{marginTop:10,fontSize:11,color:"#c9a84c"}}>{r.data} · Click to Print</div>
                  </div>
                ); })}
              </div>

              {/* Per-Umoor report cards */}
              <div className="card">
                <div className="card-hdr" style={{padding:"16px 24px",borderBottom:"1px solid rgba(184,152,90,.1)"}}>
                  <span style={{fontSize:14,fontWeight:600,color:"#e2d9c9"}}>Print by Umoor Department</span>
                </div>
                <div style={{padding:16,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                  {UMOOR_TYPES.map(function(u) {
                    var count = filesData.filter(function(f){return f.umoor_type===u;}).length;
                    return (
                      <div key={u} className="umoor-card" onClick={function(){
                        setPrintTarget({id:"umoor",label:u,umoor:u});
                        setTimeout(function(){ window.print(); }, 300);
                      }}>
                        <div className="umoor-name" style={{fontSize:12}}>{u}</div>
                        <div className="umoor-count">{count} files · Click to Print</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Print preview tables (hidden on screen, shown on print) */}
              <div style={{marginTop:24}}>
                {printTarget && printTarget.id === "mumin" && (
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr><th>ITS</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Address</th><th>Status</th></tr></thead>
                    <tbody>{muminData.map(function(m){return(<tr key={m.id}><td><span className="file-no">{m.its_number}</span></td><td>{m.name}</td><td>{m.age}</td><td>{m.gender}</td><td>{m.phone}</td><td>{m.address}</td><td><span className={"badge badge-"+(m.status||"").toLowerCase()}>{m.status}</span></td></tr>);})}</tbody>
                  </table>
                )}
                {printTarget && printTarget.id === "files_all" && (
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr><th>File No.</th><th>Title</th><th>Umoor</th><th>Year</th><th>Status</th><th>Due Date</th></tr></thead>
                    <tbody>{filesData.map(function(f){return(<tr key={f.id}><td><span className="file-no">{f.file_no}</span></td><td>{f.title}</td><td style={{fontSize:11}}>{f.umoor_type}</td><td>{f.year}</td><td><span className={"badge badge-"+(f.status||"").toLowerCase()}>{f.status}</span></td><td>{f.due_date||"—"}</td></tr>);})}</tbody>
                  </table>
                )}
                {printTarget && printTarget.id === "reminders" && (
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr><th>File No.</th><th>Title</th><th>Umoor</th><th>Status</th><th>Due Date</th></tr></thead>
                    <tbody>{filesData.filter(function(f){return f.due_date;}).sort(function(a,b){return new Date(a.due_date)-new Date(b.due_date);}).map(function(f){return(<tr key={f.id}><td><span className="file-no">{f.file_no}</span></td><td>{f.title}</td><td style={{fontSize:11}}>{f.umoor_type}</td><td><span className={"badge badge-"+(f.status||"").toLowerCase()}>{f.status}</span></td><td>{f.due_date}</td></tr>);})}</tbody>
                  </table>
                )}
                {printTarget && printTarget.id === "age_groups" && (function(){
                  var groups=[{label:"Children (0-15)",min:0,max:15},{label:"Youth (16-30)",min:16,max:30},{label:"Adults (31-60)",min:31,max:60},{label:"Seniors (61+)",min:61,max:999}];
                  return (
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <thead><tr><th>Age Group</th><th>Count</th><th>Male</th><th>Female</th><th>% of Total</th></tr></thead>
                      <tbody>{groups.map(function(g){
                        var mem=muminData.filter(function(m){return m.age>=g.min&&m.age<=g.max;});
                        var male=mem.filter(function(m){return m.gender==="Male";}).length;
                        var pct=muminData.length>0?((mem.length/muminData.length)*100).toFixed(1):0;
                        return(<tr key={g.label}><td>{g.label}</td><td style={{fontWeight:600}}>{mem.length}</td><td>{male}</td><td>{mem.length-male}</td><td>{pct}%</td></tr>);
                      })}</tbody>
                    </table>
                  );
                })()}
                {printTarget && printTarget.id === "families" && (
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr><th>Family Name</th><th>Address</th><th>Members</th></tr></thead>
                    <tbody>{familiesData.map(function(f){var cnt=familyMembers.filter(function(m){return m.family_id===f.id;}).length;return(<tr key={f.id}><td style={{fontWeight:500}}>{f.family_name}</td><td>{f.address||"—"}</td><td>{cnt}</td></tr>);})}</tbody>
                  </table>
                )}
                {printTarget && printTarget.id === "umoor" && (
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr><th>File No.</th><th>Title</th><th>Year</th><th>Date</th><th>Status</th><th>Due Date</th></tr></thead>
                    <tbody>{filesData.filter(function(f){return f.umoor_type===printTarget.umoor;}).map(function(f){return(<tr key={f.id}><td><span className="file-no">{f.file_no}</span></td><td>{f.title}</td><td>{f.year}</td><td>{f.date||"—"}</td><td><span className={"badge badge-"+(f.status||"").toLowerCase()}>{f.status}</span></td><td>{f.due_date||"—"}</td></tr>);})}</tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {page === "users" && (
            <div>
              <div className="page-hdr" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                <div><div className="page-title">Users & Roles</div><div className="page-sub">Manage access levels for each user</div></div>
              </div>

              {/* Role explanation cards */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:24}}>
                {[
                  {role:"admin",  label:"Admin",  icon:"👑", desc:"Full access — create, edit, delete everything", color:"#c9a84c"},
                  {role:"editor", label:"Editor", icon:"✏️", desc:"Can add and edit records but cannot delete", color:"#60a5fa"},
                  {role:"viewer", label:"Viewer", icon:"👁",  desc:"Read-only access — cannot modify any data", color:"#9ca3af"},
                ].map(function(r){ return (
                  <div key={r.role} className={"umoor-card" + (userRole===r.role ? " selected" : "")} style={{cursor:"default"}}>
                    <div style={{fontSize:26,marginBottom:8}}>{r.icon}</div>
                    <div style={{fontSize:13,fontWeight:600,color:r.color,marginBottom:4}}>{r.label}</div>
                    <div style={{fontSize:11,color:"#6b7280",lineHeight:1.6}}>{r.desc}</div>
                    {userRole===r.role && <div style={{marginTop:8,fontSize:10,color:r.color}}>● Your current role</div>}
                  </div>
                );}) }
              </div>

              {/* My role */}
              <div className="card" style={{marginBottom:20}}>
                <div style={{padding:"16px 24px",borderBottom:"1px solid rgba(184,152,90,.1)",fontSize:14,fontWeight:600,color:"#e2d9c9"}}>Your Access</div>
                <div style={{padding:"20px 24px",display:"flex",alignItems:"center",gap:16}}>
                  <div style={{fontSize:36}}>{userRole==="admin"?"👑":userRole==="editor"?"✏️":"👁"}</div>
                  <div>
                    <div style={{fontSize:16,fontWeight:600,color:userRole==="admin"?"#c9a84c":userRole==="editor"?"#60a5fa":"#9ca3af",textTransform:"capitalize"}}>{userRole}</div>
                    <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{session && session.user && session.user.email}</div>
                  </div>
                  <div style={{marginLeft:"auto",display:"flex",gap:10,flexWrap:"wrap"}}>
                    <span style={{fontSize:12,color:canEdit?"#34d399":"#f87171"}}>{canEdit?"✓":"✗"} Can Edit</span>
                    <span style={{fontSize:12,color:canDelete?"#34d399":"#f87171",marginLeft:12}}>{canDelete?"✓":"✗"} Can Delete</span>
                    <span style={{fontSize:12,color:"#34d399",marginLeft:12}}>✓ Can View</span>
                  </div>
                </div>
              </div>

              {/* User role assignments — admin only */}
              {isAdmin && (
                <div className="card">
                  <div style={{padding:"16px 24px",borderBottom:"1px solid rgba(184,152,90,.1)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:14,fontWeight:600,color:"#e2d9c9"}}>Assign Roles to Users</span>
                    <span style={{fontSize:11,color:"#6b7280"}}>Users must first be created in Supabase → Authentication → Users</span>
                  </div>
                  <div style={{padding:24}}>
                    <div style={{background:"rgba(201,168,76,.05)",border:"1px solid rgba(201,168,76,.12)",borderRadius:10,padding:"16px 20px",marginBottom:20}}>
                      <div style={{fontSize:12,color:"#c9a84c",fontWeight:600,marginBottom:8}}>How to assign a role</div>
                      <div style={{fontSize:12,color:"#9ca3af",lineHeight:1.8}}>
                        Run this in your <strong style={{color:"#e2d9c9"}}>Supabase SQL Editor</strong>, replacing the email and role:
                      </div>
                      <div style={{background:"#0d1117",borderRadius:8,padding:"12px 16px",marginTop:10,fontFamily:"monospace",fontSize:12,color:"#34d399",lineHeight:1.8}}>
                        {"INSERT INTO user_roles (user_id, role)"}<br/>
                        {"SELECT id, 'editor' FROM auth.users"}<br/>
                        {"WHERE email = 'user@example.com'"}<br/>
                        {"ON CONFLICT (user_id) DO UPDATE SET role = 'editor';"}
                      </div>
                      <div style={{marginTop:10,fontSize:11,color:"#6b7280"}}>
                        Replace <code style={{color:"#c9a84c"}}>'editor'</code> with <code style={{color:"#c9a84c"}}>'admin'</code>, <code style={{color:"#c9a84c"}}>'editor'</code>, or <code style={{color:"#c9a84c"}}>'viewer'</code>
                      </div>
                    </div>
                    <div style={{background:"rgba(96,165,250,.04)",border:"1px solid rgba(96,165,250,.12)",borderRadius:10,padding:"16px 20px"}}>
                      <div style={{fontSize:12,color:"#60a5fa",fontWeight:600,marginBottom:8}}>Permission Summary</div>
                      <table style={{width:"100%",fontSize:12}}>
                        <thead>
                          <tr>
                            <th style={{textAlign:"left",color:"#6b7280",padding:"4px 0",fontWeight:500}}>Action</th>
                            <th style={{textAlign:"center",color:"#c9a84c",padding:"4px 8px"}}>Admin</th>
                            <th style={{textAlign:"center",color:"#60a5fa",padding:"4px 8px"}}>Editor</th>
                            <th style={{textAlign:"center",color:"#9ca3af",padding:"4px 8px"}}>Viewer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ["View all data","✓","✓","✓"],
                            ["Add records","✓","✓","✗"],
                            ["Edit records","✓","✓","✗"],
                            ["Delete records","✓","✗","✗"],
                            ["Import data","✓","✓","✗"],
                            ["Manage users","✓","✗","✗"],
                          ].map(function(row){return(
                            <tr key={row[0]} style={{borderTop:"1px solid rgba(255,255,255,.03)"}}>
                              <td style={{padding:"7px 0",color:"#d1c9bb"}}>{row[0]}</td>
                              <td style={{textAlign:"center",color:row[1]==="✓"?"#34d399":"#f87171"}}>{row[1]}</td>
                              <td style={{textAlign:"center",color:row[2]==="✓"?"#34d399":"#f87171"}}>{row[2]}</td>
                              <td style={{textAlign:"center",color:row[3]==="✓"?"#34d399":"#f87171"}}>{row[3]}</td>
                            </tr>
                          );})}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {page === "files" && (
            <div>
              <div className="page-hdr">
                <div className="page-title">Umoor Files</div>
                <div className="page-sub">Documents, scans and records</div>
              </div>
              <div className="year-tabs">
                <button className={"year-tab" + (!selYear ? " active" : "")} onClick={function() { setSelYear(null); }}>All Years</button>
                {YEARS.map(function(y) {
                  return <button key={y} className={"year-tab" + (selYear === y ? " active" : "")} onClick={function() { setSelYear(y); }}>{y}</button>;
                })}
              </div>
              <div className="card">
                <div className="card-hdr">
                  <span className="card-title">Files ({filteredFiles.length})</span>
                  {canEdit && <button className="btn btn-primary" onClick={function() { openModal("file", "add"); }}>+ New File</button>}
                </div>
                <div className="toolbar">
                  <input style={{ width: 220 }} placeholder="Search files…" value={search} onChange={function(e) { setSearch(e.target.value); }} />
                  <select value={selUmoor || ""} onChange={function(e) { setSelUmoor(e.target.value || null); }} style={{ width: 220 }}>
                    <option value="">All Umoor</option>
                    {UMOOR_TYPES.map(function(u) { return <option key={u} value={u}>{u}</option>; })}
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={loadAll}>{loading ? <Spinner /> : "↻"}</button>
                </div>
                {loading ? <div className="loading"><Spinner /> Loading…</div> : filteredFiles.length === 0 ? (
                  <div className="empty"><div className="empty-icon">🗂</div><div>No files found</div></div>
                ) : (
                  <table>
                    <thead>
                      <tr><th>File No.</th><th>Title</th><th>Umoor</th><th>Year</th><th>Date</th><th>Due Date</th><th>Attachments</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {filteredFiles.map(function(f) {
                        var atts = getFileAtts(f.id);
                        return (
                          <tr key={f.id} className="clickable-row" onClick={function() { setFilePreview(f); }}>
                            <td><span className="file-no">{f.file_no}</span></td>
                            <td style={{ fontWeight: 500 }}>{f.title}</td>
                            <td style={{ fontSize: 12, color: "#9ca3af" }}>{f.umoor_type}</td>
                            <td>{f.year}</td>
                            <td style={{ fontSize: 12, color: "#6b7280" }}>{f.date}</td>
                            <td>{f.due_date ? (function(){
                              var d=new Date(f.due_date); var t=new Date(); t.setHours(0,0,0,0); d.setHours(0,0,0,0);
                              var diff=(d-t)/(1000*60*60*24);
                              var cls=diff<0?"rb-overdue":diff<=7?"rb-soon":"";
                              return <span className={"reminder-badge "+cls} style={{fontSize:10}}>{f.due_date}</span>;
                            })() : <span style={{color:"#4b5563",fontSize:12}}>—</span>}</td>
                            <td>{atts.length > 0 ? <span className="attach-chip">📎 {atts.length}</span> : <span style={{ color: "#4b5563", fontSize: 12 }}>—</span>}</td>
                            <td><span className={"badge badge-" + (f.status || "").toLowerCase()}>{f.status}</span></td>
                            <td>
                              <div className="act-col" onClick={function(e) { e.stopPropagation(); }}>
                                {canEdit && <button className="btn btn-ghost btn-sm" onClick={function() { openModal("file", "edit", f); }}>Edit</button>}
                                {canDelete && <button className="btn btn-danger" onClick={function() { deleteRecord("file", f.id); }}>Del</button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {page === "mumin" && (
            <div>
              <div className="page-hdr">
                <div className="page-title">Mumin Data</div>
                <div className="page-sub">Registered members</div>
              </div>
              <div className="card">
                <div className="card-hdr">
                  <span className="card-title">Members ({filteredMumin.length})</span>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn btn-ghost btn-sm" onClick={loadAll}>{loading ? <Spinner /> : "↻"}</button>
                    {canEdit && <button className="btn btn-primary" onClick={function() { openModal("mumin", "add"); }}>+ Add Mumin</button>}
                  </div>
                </div>
                <div className="toolbar">
                  <input style={{ width: 260 }} placeholder="Search by name or ITS…" value={search} onChange={function(e) { setSearch(e.target.value); }} />
                </div>
                {loading ? <div className="loading"><Spinner /> Loading…</div> : filteredMumin.length === 0 ? (
                  <div className="empty"><div className="empty-icon">👤</div><div>No records found</div></div>
                ) : (
                  <table>
                    <thead>
                      <tr><th>ITS No.</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Address</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {filteredMumin.map(function(m) {
                        return (
                          <tr key={m.id} className="clickable-row" onClick={function() { setMuminPreview(m); }}>
                            <td><span className="file-no">{m.its_number}</span></td>
                            <td style={{ fontWeight: 500 }}>{m.name}</td>
                            <td>{m.age}</td>
                            <td><span className={"badge badge-" + (m.gender || "").toLowerCase()}>{m.gender}</span></td>
                            <td style={{ fontSize: 12, color: "#9ca3af" }}>{m.phone}</td>
                            <td style={{ fontSize: 12, color: "#6b7280" }}>{m.address}</td>
                            <td><span className={"badge badge-" + (m.status || "").toLowerCase()}>{m.status}</span></td>
                            <td>
                              <div className="act-col" onClick={function(e) { e.stopPropagation(); }}>
                                {canEdit && <button className="btn btn-ghost btn-sm" onClick={function() { openModal("mumin", "edit", m); }}>Edit</button>}
                                {canDelete && <button className="btn btn-danger" onClick={function() { deleteRecord("mumin", m.id); }}>Del</button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={function(e) { e.stopPropagation(); }}>
            <div className="modal-hdr">
              <div className="modal-title">{modal.mode === "add" ? "Add" : "Edit"} {modal.type === "mumin" ? "Mumin Record" : "Umoor File"}</div>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              {modal.type === "mumin" ? (
                <div className="form-grid">
                  <div className="form-grp">
                    <label>ITS Number</label>
                    <input value={form.its_number || ""} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { its_number: e.target.value }); }); }} placeholder="e.g. 10001" />
                  </div>
                  <div className="form-grp">
                    <label>Status</label>
                    <select value={form.status || "Active"} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { status: e.target.value }); }); }}>
                      <option>Active</option><option>Inactive</option>
                    </select>
                  </div>
                  <div className="form-grp full">
                    <label>Full Name</label>
                    <input value={form.name || ""} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { name: e.target.value }); }); }} placeholder="Enter full name" />
                  </div>
                  <div className="form-grp">
                    <label>Age</label>
                    <input type="number" value={form.age || ""} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { age: e.target.value }); }); }} />
                  </div>
                  <div className="form-grp">
                    <label>Gender</label>
                    <select value={form.gender || "Male"} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { gender: e.target.value }); }); }}>
                      <option>Male</option><option>Female</option>
                    </select>
                  </div>
                  <div className="form-grp">
                    <label>Phone</label>
                    <input value={form.phone || ""} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { phone: e.target.value }); }); }} />
                  </div>
                  <div className="form-grp">
                    <label>Email</label>
                    <input value={form.email || ""} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { email: e.target.value }); }); }} />
                  </div>
                  <div className="form-grp full">
                    <label>Address</label>
                    <input value={form.address || ""} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { address: e.target.value }); }); }} />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="form-grid">
                    <div className="form-grp">
                      <label>Year</label>
                      <select value={form.year || 2024} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { year: Number(e.target.value) }); }); }}>
                        {YEARS.map(function(y) { return <option key={y}>{y}</option>; })}
                      </select>
                    </div>
                    <div className="form-grp">
                      <label>Status</label>
                      <select value={form.status || "Active"} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { status: e.target.value }); }); }}>
                        <option>Active</option><option>Closed</option><option>Pending</option>
                      </select>
                    </div>
                    <div className="form-grp full">
                      <label>Umoor Type</label>
                      <select value={form.umoor_type || ""} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { umoor_type: e.target.value }); }); }}>
                        <option value="">Select Umoor</option>
                        {UMOOR_TYPES.map(function(u) { return <option key={u}>{u}</option>; })}
                      </select>
                    </div>
                    <div className="form-grp full">
                      <label>File Title</label>
                      <input value={form.title || ""} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { title: e.target.value }); }); }} placeholder="Enter file title" />
                    </div>
                    <div className="form-grp">
                      <label>Date</label>
                      <input type="date" value={form.date || ""} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { date: e.target.value }); }); }} />
                    </div>
                    <div className="form-grp">
                      <label>File No. (auto if blank)</label>
                      <input value={form.file_no || ""} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { file_no: e.target.value }); }); }} placeholder="Auto-generated" />
                    </div>
                    <div className="form-grp full">
                      <label>Description</label>
                      <textarea value={form.description || ""} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, { description: e.target.value }); }); }} placeholder="Notes or description" />
                    </div>
                  </div>
                  <div className="sec-div" />
                  <div className="sec-lbl">📎 Attachments — Scans and Photos</div>
                  <UploadZone onFiles={function(files) { setFormAtts(function(a) { return a.concat(files); }); }} uploading={uploading} />
                  <AttList atts={formAtts}
                    onRemove={function(i) { setFormAtts(function(a) { return a.filter(function(_, idx) { return idx !== i; }); }); }}
                    onView={function(a) { setLightbox({ url: a.url || a.dataUrl, name: a.name }); }} />
                </div>
              )}
            </div>
            <div className="modal-ftr">
              <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" disabled={saving}
                onClick={modal.type === "mumin" ? saveMumin : saveFile}>
                {saving ? <span><Spinner /> Saving…</span> : "Save to Cloud ☁"}
              </button>
            </div>
          </div>
        </div>
      )}

      {famModal && (function() {
        var fam = famModal.record;
        var members = fam ? familyMembers.filter(function(m) { return m.family_id === fam.id; }) : [];
        var getMumin = function(its) { return muminData.find(function(m) { return m.its_number === its; }); };
        var saveFam = function() {
          if (!famForm.family_name || famForm.family_name.trim() === "") {
            showToast("Please enter a family name", "error"); return;
          }
          var payload = { family_name: famForm.family_name.trim(), address: famForm.address || "", notes: famForm.notes || "" };
          var p = famModal.mode === "add" ? sbInsert("families", payload) : sbUpdate("families", fam.id, payload);
          p.then(function(r) {
            loadAll();
            setFamModal(null);
            showToast(famModal.mode === "add" ? "Family created ☁" : "Family updated ☁");
          }).catch(function(e) {
            showToast("Error: " + e.message, "error");
          });
        };
        var addMember = function() {
          if (!famMemberForm.its_number) return;
          sbInsert("family_members", { family_id: fam.id, its_number: famMemberForm.its_number, role: famMemberForm.role || "Head" })
            .then(function() { loadAll(); setFamMemberForm({ its_number: "", role: "Head" }); showToast("Member added"); })
            .catch(function(e) { showToast("Error: " + e.message, "error"); });
        };
        var removeMember = function(id) {
          sbDelete("family_members", id).then(loadAll).catch(function(e) { showToast("Error: " + e.message, "error"); });
        };
        return (
          <div className="modal-overlay" onClick={function() { setFamModal(null); }}>
            <div className="modal" onClick={function(e) { e.stopPropagation(); }}>
              <div className="modal-hdr">
                <div className="modal-title">{famModal.mode === "add" ? "New Family" : famModal.mode === "edit" ? "Edit Family" : (fam ? fam.family_name : "")}</div>
                <button className="modal-close" onClick={function() { setFamModal(null); }}>x</button>
              </div>
              <div className="modal-body">
                {(famModal.mode === "add" || famModal.mode === "edit") && (
                  <div className="form-grid">
                    <div className="form-grp full"><label>Family Name</label>
                      <input value={famForm.family_name || ""} onChange={function(e) { setFamForm(function(f) { return Object.assign({},f,{family_name:e.target.value}); }); }} placeholder="e.g. Al-Hussaini Family" />
                    </div>
                    <div className="form-grp full"><label>Address</label>
                      <input value={famForm.address || ""} onChange={function(e) { setFamForm(function(f) { return Object.assign({},f,{address:e.target.value}); }); }} placeholder="Block / Street / Area" />
                    </div>
                    <div className="form-grp full"><label>Notes</label>
                      <textarea value={famForm.notes || ""} onChange={function(e) { setFamForm(function(f) { return Object.assign({},f,{notes:e.target.value}); }); }} placeholder="Any notes" />
                    </div>
                  </div>
                )}
                {famModal.mode === "view" && fam && (
                  <div>
                    {fam.address && <div style={{fontSize:12,color:"#6b7280",marginBottom:4}}>{fam.address}</div>}
                    {fam.notes && <div style={{fontSize:12,color:"#9ca3af",marginBottom:16}}>{fam.notes}</div>}
                    <div className="sec-label">Members ({members.length})</div>
                    <div className="fam-modal-members">
                      {members.map(function(mem) {
                        var mumin = getMumin(mem.its_number);
                        return (
                          <div className="fam-member-item" key={mem.id}>
                            <div className="fam-member-info">
                              <div className="fam-member-its">{mem.its_number}</div>
                              <div style={{fontSize:13,color:"#e2d9c9"}}>{mumin ? mumin.name : "Unknown ITS"}</div>
                              {mumin && <div style={{fontSize:11,color:"#6b7280"}}>{mumin.gender}{mumin.age ? ", age "+mumin.age : ""}</div>}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <span className={"fam-member-role role-"+(mem.role||"").toLowerCase()}>{mem.role}</span>
                              <button className="btn btn-danger" style={{padding:"3px 8px"}} onClick={function(){removeMember(mem.id);}}>x</button>
                            </div>
                          </div>
                        );
                      })}
                      {members.length === 0 && <div style={{color:"#4b5563",fontSize:13,padding:"12px 0"}}>No members yet.</div>}
                    </div>
                    <div className="sec-divider" />
                    <div className="sec-label">Add Member</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 130px 80px",gap:10,alignItems:"end"}}>
                      <div className="form-grp"><label>Select Mumin</label>
                        <select value={famMemberForm.its_number} onChange={function(e){setFamMemberForm(function(f){return Object.assign({},f,{its_number:e.target.value});});}}>
                          <option value="">Choose member...</option>
                          {muminData.filter(function(m){return !members.find(function(mem){return mem.its_number===m.its_number;});}).map(function(m){
                            return <option key={m.id} value={m.its_number}>{m.name} ({m.its_number})</option>;
                          })}
                        </select>
                      </div>
                      <div className="form-grp"><label>Role</label>
                        <select value={famMemberForm.role} onChange={function(e){setFamMemberForm(function(f){return Object.assign({},f,{role:e.target.value});});}}>
                          <option>Head</option><option>Spouse</option><option>Child</option><option>Other</option>
                        </select>
                      </div>
                      <div className="form-grp"><label style={{opacity:0}}>x</label>
                        <button className="btn btn-primary" onClick={addMember}>Add</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {(famModal.mode === "add" || famModal.mode === "edit") && (
                <div className="modal-ftr">
                  <button className="btn btn-ghost" onClick={function(){setFamModal(null);}}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveFam}>Save Family</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {ieModal && (
        <IEModal
          onClose={function() { setIeModal(false); }}
          muminData={muminData}
          filesData={filesData}
          onImportMumin={handleImportMumin}
          onImportFiles={handleImportFiles}
          importing={importing}
        />
      )}


      {muminPreview && (function() {
        var m = muminPreview;
        var family = (function() {
          var mem = familyMembers.find(function(fm) { return fm.its_number === m.its_number; });
          if (!mem) return null;
          return { fam: familiesData.find(function(f) { return f.id === mem.family_id; }), role: mem.role };
        })();
        return (
          <div className="preview-overlay" onClick={function() { setMuminPreview(null); }}>
            <div className="preview-box" onClick={function(e) { e.stopPropagation(); }}>
              <div className="preview-hdr">
                <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                  <div className="preview-avatar">{m.name ? m.name[0].toUpperCase() : "?"}</div>
                  <div>
                    <div className="preview-name">{m.name}</div>
                    <div className="preview-its">ITS: {m.its_number}</div>
                    <span className={"badge badge-" + (m.status||"").toLowerCase()} style={{ marginTop:6, display:"inline-block" }}>{m.status}</span>
                  </div>
                </div>
                <button className="modal-close" onClick={function() { setMuminPreview(null); }}>x</button>
              </div>
              <div className="preview-body">
                <div className="preview-section">
                  <div className="preview-sec-title">Personal Details</div>
                  <div className="preview-grid">
                    <div className="preview-field"><div className="preview-field-label">Age</div><div className="preview-field-val">{m.age||"—"}</div></div>
                    <div className="preview-field"><div className="preview-field-label">Gender</div><div className="preview-field-val">{m.gender||"—"}</div></div>
                    <div className="preview-field"><div className="preview-field-label">Phone</div><div className="preview-field-val">{m.phone||"—"}</div></div>
                    <div className="preview-field"><div className="preview-field-label">Email</div><div className="preview-field-val" style={{fontSize:12}}>{m.email||"—"}</div></div>
                    <div className="preview-field" style={{gridColumn:"span 2"}}><div className="preview-field-label">Address</div><div className="preview-field-val">{m.address||"—"}</div></div>
                  </div>
                </div>
                {family && family.fam && (
                  <div className="preview-section">
                    <div className="preview-sec-title">Family</div>
                    <div className="preview-family-chip">
                      {"\uD83C\uDFE0"} {family.fam.family_name}
                      <span className={"fam-member-role role-"+(family.role||"").toLowerCase()} style={{marginLeft:4}}>{family.role}</span>
                    </div>
                    {family.fam.address && <div style={{fontSize:12,color:"#6b7280",marginTop:8}}>{family.fam.address}</div>}
                  </div>
                )}
                <div style={{display:"flex",gap:10,marginTop:8}}>
                  {canEdit && <button className="btn btn-primary" style={{flex:1}} onClick={function(){ setMuminPreview(null); openModal("mumin","edit",m); }}>Edit Record</button>}
                  <button className="btn btn-ghost" onClick={function(){ printMumin(m, family); }}>🖨 Print</button>
                  <button className="btn btn-ghost" onClick={function(){ setMuminPreview(null); }}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {filePreview && (function() {
        var f = filePreview;
        var atts = getFileAtts(f.id);
        return (
          <div className="preview-overlay" onClick={function() { setFilePreview(null); }}>
            <div className="file-preview-box" onClick={function(e) { e.stopPropagation(); }}>
              <div className="file-preview-hdr">
                <div>
                  <div style={{fontSize:11,color:"#c9a84c",marginBottom:4,textTransform:"uppercase",letterSpacing:2}}>{f.umoor_type}</div>
                  <div className="file-preview-title">{f.title}</div>
                  <span className={"badge badge-"+(f.status||"").toLowerCase()} style={{marginTop:8,display:"inline-block"}}>{f.status}</span>
                </div>
                <button className="modal-close" onClick={function(){ setFilePreview(null); }}>x</button>
              </div>
              <div className="file-preview-body">
                <div className="file-meta-grid">
                  <div className="file-meta-item"><div className="file-meta-label">File No.</div><div className="file-meta-val" style={{fontFamily:"monospace",color:"#c9a84c"}}>{f.file_no}</div></div>
                  <div className="file-meta-item"><div className="file-meta-label">Year</div><div className="file-meta-val">{f.year}</div></div>
                  <div className="file-meta-item"><div className="file-meta-label">Date</div><div className="file-meta-val">{f.date||"—"}</div></div>
                </div>
                {f.description && (
                  <div style={{background:"rgba(255,255,255,.02)",border:"1px solid rgba(184,152,90,.08)",borderRadius:8,padding:"12px 16px",marginBottom:20}}>
                    <div style={{fontSize:10,color:"#6b7280",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Description</div>
                    <div style={{fontSize:13,color:"#d1c9bb",lineHeight:1.6}}>{f.description}</div>
                  </div>
                )}
                <div className="preview-sec-title">Attachments ({atts.length})</div>
                {atts.length === 0 ? (
                  <div className="att-viewer-empty">No attachments for this file.</div>
                ) : (
                  <div className="att-viewer-grid">
                    {atts.map(function(att) {
                      var isImg = att.type && att.type.startsWith("image/");
                      var isPdf = att.type === "application/pdf";
                      return (
                        <div className="att-viewer-item" key={att.id} onClick={function(){
                          if (isImg) setLightbox({ url: att.url, name: att.name });
                          else if (att.url) window.open(att.url, "_blank");
                        }}>
                          {isImg
                            ? <img className="att-viewer-thumb" src={att.url} alt={att.name} />
                            : <div className="att-viewer-pdf">{isPdf ? "\uD83D\uDCC4" : "\uD83D\uDCCE"}</div>}
                          <div className="att-viewer-name" title={att.name}>{att.name}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{display:"flex",gap:10,marginTop:20}}>
                  {canEdit && <button className="btn btn-primary" style={{flex:1}} onClick={function(){ setFilePreview(null); openModal("file","edit",f); }}>Edit File</button>}
                  <button className="btn btn-ghost" onClick={function(){ printFile(f, atts); }}>🖨 Print</button>
                  <button className="btn btn-ghost" onClick={function(){ setFilePreview(null); }}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {lightbox && (
        <div className="lightbox" onClick={function() { setLightbox(null); }}>
          <button className="lightbox-close" onClick={function() { setLightbox(null); }}>×</button>
          <img src={lightbox.url} alt={lightbox.name} onClick={function(e) { e.stopPropagation(); }} />
          <div className="lightbox-name">{lightbox.name}</div>
        </div>
      )}

      {toast && (
        <div className={"toast toast-" + toast.type}>
          {toast.type === "success" ? "✓" : "⚠"} {toast.msg}
        </div>
      )}
    </>
  );
}
