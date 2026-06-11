import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://fluflwpnbqfqcvcjkgjn.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdWZsd3BuYnFmcWN2Y2prZ2puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTgwNTQsImV4cCI6MjA5NjU3NDA1NH0.LT7b18SGQXeth32XhOtVd-CJ2t3WiREf8daze_VwDdo";

let SESSION_TOKEN = null;

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON,
    "Authorization": "Bearer " + (SESSION_TOKEN || SUPABASE_ANON),
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
      "Authorization": "Bearer " + (SESSION_TOKEN || SUPABASE_ANON),
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
  "Umoor Dakheliyah", "Umoor Deeniyah", "Umoor Marafiq Burhaniyah",
  "Umoor Maliyah", "Umoor Talimiyah", "Umoor Ijtima'iyah",
  "Umoor Tibbiyah", "Umoor Tijarah", "Umoor Kharijiyah",
  "Umoor Siyasiyah", "Umoor Qanuniyah", "Umoor Akhbar",
];
const YEARS = [2022, 2023, 2024, 2025];
const MUMIN_COLS = ["its_number","name","age","gender","phone","email","address","status"];
const FILE_COLS  = ["file_no","umoor_type","year","title","description","status","date"];

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
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
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var rows = file.name.indexOf(".json") >= 0
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
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={function() { downloadBlob(toCSV(muminData, MUMIN_COLS), "mumin_data.csv", "text/csv"); }}>CSV</button>
                  <button className="btn btn-ghost btn-sm" onClick={function() { downloadBlob(JSON.stringify(muminData, null, 2), "mumin_data.json", "application/json"); }}>JSON</button>
                </div>
              </div>
              <div className="ie-opt">
                <div>
                  <div className="ie-opt-title">🗂 Umoor Files</div>
                  <div className="ie-opt-desc">{filesData.length} records</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={function() { downloadBlob(toCSV(filesData, FILE_COLS), "umoor_files.csv", "text/csv"); }}>CSV</button>
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
              <input ref={ref} type="file" accept=".csv,.json" style={{ display: "none" }} onChange={function(e) { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
              <div className="drop-zone" onClick={function() { ref.current.click(); }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>📂</div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>Click to choose CSV or JSON file</div>
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

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [muminData, setMuminData] = useState([]);
  const [filesData, setFilesData] = useState([]);
  const [attsData, setAttsData] = useState([]);
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
      ]);
      setMuminData(results[0] || []);
      setFilesData(results[1] || []);
      setAttsData(results[2] || []);
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
            SESSION_TOKEN = s.access_token;
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
    SESSION_TOKEN = data.access_token;
    setSession(data);
    try { localStorage.setItem("hm_session", JSON.stringify(data)); } catch(e) {}
    loadAll();
  }

  function handleSignOut() {
    sbSignOut(session && session.access_token);
    SESSION_TOKEN = null;
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
            ].map(function(n) {
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
                  <button className="btn btn-primary" onClick={function() { openModal("file", "add"); }}>+ New File</button>
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
                      <tr><th>File No.</th><th>Title</th><th>Umoor</th><th>Year</th><th>Date</th><th>Attachments</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {filteredFiles.map(function(f) {
                        var atts = getFileAtts(f.id);
                        return (
                          <tr key={f.id}>
                            <td><span className="file-no">{f.file_no}</span></td>
                            <td style={{ fontWeight: 500 }}>{f.title}</td>
                            <td style={{ fontSize: 12, color: "#9ca3af" }}>{f.umoor_type}</td>
                            <td>{f.year}</td>
                            <td style={{ fontSize: 12, color: "#6b7280" }}>{f.date}</td>
                            <td>{atts.length > 0 ? <span className="attach-chip">📎 {atts.length}</span> : <span style={{ color: "#4b5563", fontSize: 12 }}>—</span>}</td>
                            <td><span className={"badge badge-" + (f.status || "").toLowerCase()}>{f.status}</span></td>
                            <td>
                              <div className="act-col">
                                <button className="btn btn-ghost btn-sm" onClick={function() { openModal("file", "edit", f); }}>Edit</button>
                                <button className="btn btn-danger" onClick={function() { deleteRecord("file", f.id); }}>Del</button>
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
                    <button className="btn btn-primary" onClick={function() { openModal("mumin", "add"); }}>+ Add Mumin</button>
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
                          <tr key={m.id}>
                            <td><span className="file-no">{m.its_number}</span></td>
                            <td style={{ fontWeight: 500 }}>{m.name}</td>
                            <td>{m.age}</td>
                            <td><span className={"badge badge-" + (m.gender || "").toLowerCase()}>{m.gender}</span></td>
                            <td style={{ fontSize: 12, color: "#9ca3af" }}>{m.phone}</td>
                            <td style={{ fontSize: 12, color: "#6b7280" }}>{m.address}</td>
                            <td><span className={"badge badge-" + (m.status || "").toLowerCase()}>{m.status}</span></td>
                            <td>
                              <div className="act-col">
                                <button className="btn btn-ghost btn-sm" onClick={function() { openModal("mumin", "edit", m); }}>Edit</button>
                                <button className="btn btn-danger" onClick={function() { deleteRecord("mumin", m.id); }}>Del</button>
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
