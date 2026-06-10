import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://fluflwpnbqfqcvcjkgjn.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdWZsd3BuYnFmcWN2Y2prZ2puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTgwNTQsImV4cCI6MjA5NjU3NDA1NH0.LT7b18SGQXeth32XhOtVd-CJ2t3WiREf8daze_VwDdo";

function getHeaders(token) {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON,
    "Authorization": `Bearer ${token || SUPABASE_ANON}`,
    "Prefer": "return=representation",
  };
}
// Will be set after login
let SESSION_TOKEN = null;

// ── Supabase helpers ──────────────────────────────────────────────
async function sbGet(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: getHeaders(SESSION_TOKEN) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function sbInsert(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST", headers: getHeaders(SESSION_TOKEN), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function sbUpdate(table, id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH", headers: getHeaders(SESSION_TOKEN), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function sbDelete(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE", headers: { ...getHeaders(SESSION_TOKEN), Prefer: "return=minimal" },
  });
  if (!res.ok) throw new Error(await res.text());
}
async function uploadFile(file, path) {
  // Convert dataUrl to blob
  const res2 = await fetch(file.dataUrl);
  const blob = await res2.blob();
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/uploads/${path}`, {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SESSION_TOKEN || SUPABASE_ANON}`, "Content-Type": blob.type },
    body: blob,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/uploads/${path}`;
}


// ── Auth helpers ──────────────────────────────────────────────────
async function sbSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Login failed");
  return data; // { access_token, user, expires_in, ... }
}

async function sbSignOut(token) {
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${token}` },
  });
}

async function sbGetUser(token) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// ── Constants ─────────────────────────────────────────────────────
const UMOOR_TYPES = [
  "Umoor Dakheliyah","Umoor Deeniyah","Umoor Marafiq Burhaniyah",
  "Umoor Maliyah","Umoor Talimiyah","Umoor Ijtima'iyah",
  "Umoor Tibbiyah","Umoor Tijarah","Umoor Kharijiyah",
  "Umoor Siyasiyah","Umoor Qanuniyah","Umoor Akhbar",
];
const YEARS = [2022, 2023, 2024, 2025];

// ── Styles ────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Jost:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1117; color: #e2d9c9; font-family: 'Jost', sans-serif; }
  .app { min-height: 100vh; background: #0d1117; }
  .layout { display: flex; min-height: 100vh; }
  .sidebar { width: 260px; flex-shrink: 0; background: linear-gradient(180deg,#111820 0%,#0d1117 100%); border-right: 1px solid rgba(184,152,90,0.15); display: flex; flex-direction: column; position: fixed; height: 100vh; overflow-y: auto; z-index: 10; }
  .sidebar-logo { padding: 28px 24px 20px; border-bottom: 1px solid rgba(184,152,90,0.12); }
  .logo-arabic { font-family: 'Amiri', serif; font-size: 22px; color: #c9a84c; letter-spacing: 0.5px; line-height: 1.3; }
  .logo-sub { font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #6b7280; margin-top: 4px; }
  .cloud-badge { display: inline-flex; align-items: center; gap: 4px; background: rgba(52,211,153,0.1); color: #34d399; border: 1px solid rgba(52,211,153,0.2); border-radius: 10px; padding: 2px 8px; font-size: 10px; margin-top: 8px; }
  .nav { padding: 16px 12px; flex: 1; }
  .nav-label { font-size: 9px; text-transform: uppercase; letter-spacing: 3px; color: #4b5563; padding: 10px 12px 6px; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; color: #9ca3af; font-weight: 400; transition: all 0.2s; margin-bottom: 2px; border: 1px solid transparent; }
  .nav-item:hover { background: rgba(184,152,90,0.06); color: #e2d9c9; }
  .nav-item.active { background: rgba(184,152,90,0.1); color: #c9a84c; border-color: rgba(184,152,90,0.2); font-weight: 500; }
  .nav-icon { width: 18px; text-align: center; font-size: 15px; }
  .sidebar-footer { padding: 16px 24px; border-top: 1px solid rgba(184,152,90,0.1); font-size: 11px; color: #374151; }
  .main { margin-left: 260px; padding: 36px; flex: 1; }
  .page-header { margin-bottom: 32px; }
  .page-title { font-family: 'Amiri', serif; font-size: 28px; color: #c9a84c; font-weight: 700; }
  .page-sub { font-size: 13px; color: #6b7280; margin-top: 4px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(184,152,90,0.12); border-radius: 12px; padding: 20px; position: relative; overflow: hidden; }
  .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg,#c9a84c,transparent); }
  .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #6b7280; }
  .stat-value { font-size: 32px; font-weight: 600; color: #e2d9c9; margin-top: 6px; line-height: 1; }
  .stat-desc { font-size: 12px; color: #4b5563; margin-top: 4px; }
  .card { background: rgba(255,255,255,0.02); border: 1px solid rgba(184,152,90,0.1); border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
  .card-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid rgba(184,152,90,0.1); }
  .card-title { font-size: 14px; font-weight: 600; color: #e2d9c9; }
  .toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 24px; border-bottom: 1px solid rgba(184,152,90,0.08); flex-wrap: wrap; }
  input, select, textarea { background: rgba(255,255,255,0.04); border: 1px solid rgba(184,152,90,0.15); color: #e2d9c9; border-radius: 8px; padding: 8px 12px; font-size: 13px; font-family: 'Jost', sans-serif; outline: none; transition: border 0.2s; width: 100%; }
  input:focus, select:focus, textarea:focus { border-color: rgba(201,168,76,0.4); }
  input::placeholder, textarea::placeholder { color: #4b5563; }
  select option { background: #111820; }
  textarea { resize: vertical; min-height: 72px; }
  .btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all 0.2s; font-family: 'Jost', sans-serif; display: inline-flex; align-items: center; gap: 6px; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary { background: #c9a84c; color: #0d1117; }
  .btn-primary:hover:not(:disabled) { background: #dbb95d; }
  .btn-ghost { background: transparent; border: 1px solid rgba(184,152,90,0.2); color: #9ca3af; }
  .btn-ghost:hover:not(:disabled) { border-color: rgba(201,168,76,0.4); color: #c9a84c; }
  .btn-danger { background: transparent; border: 1px solid rgba(239,68,68,0.2); color: #f87171; font-size: 12px; padding: 5px 10px; }
  .btn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.08); }
  .btn-sm { padding: 5px 10px; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #6b7280; padding: 12px 20px; border-bottom: 1px solid rgba(184,152,90,0.1); font-weight: 500; }
  td { padding: 13px 20px; font-size: 13px; color: #d1c9bb; border-bottom: 1px solid rgba(255,255,255,0.03); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(184,152,90,0.03); }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
  .badge-active { background: rgba(52,211,153,0.1); color: #34d399; border: 1px solid rgba(52,211,153,0.2); }
  .badge-closed { background: rgba(107,114,128,0.1); color: #9ca3af; border: 1px solid rgba(107,114,128,0.2); }
  .badge-pending { background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
  .badge-male { background: rgba(96,165,250,0.1); color: #60a5fa; border: 1px solid rgba(96,165,250,0.15); }
  .badge-female { background: rgba(244,114,182,0.1); color: #f472b6; border: 1px solid rgba(244,114,182,0.15); }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 100; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
  .modal { background: #111820; border: 1px solid rgba(184,152,90,0.2); border-radius: 16px; width: 580px; max-height: 88vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.5); }
  .modal-header { padding: 24px 28px 20px; border-bottom: 1px solid rgba(184,152,90,0.1); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: #111820; z-index: 1; }
  .modal-title { font-family: 'Amiri', serif; font-size: 20px; color: #c9a84c; }
  .modal-close { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 22px; line-height: 1; padding: 0; width: auto; }
  .modal-close:hover { color: #e2d9c9; }
  .modal-body { padding: 24px 28px; }
  .modal-footer { padding: 16px 28px; border-top: 1px solid rgba(184,152,90,0.1); display: flex; justify-content: flex-end; gap: 10px; position: sticky; bottom: 0; background: #111820; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group.full { grid-column: span 2; }
  label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; }
  .year-tabs { display: flex; gap: 6px; margin-bottom: 24px; flex-wrap: wrap; }
  .year-tab { padding: 7px 18px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid rgba(184,152,90,0.15); color: #6b7280; background: transparent; transition: all 0.2s; }
  .year-tab.active { background: #c9a84c; color: #0d1117; border-color: #c9a84c; }
  .year-tab:hover:not(.active) { border-color: rgba(201,168,76,0.3); color: #c9a84c; }
  .umoor-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
  .umoor-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(184,152,90,0.1); border-radius: 10px; padding: 16px; cursor: pointer; transition: all 0.2s; }
  .umoor-card:hover { border-color: rgba(201,168,76,0.3); background: rgba(184,152,90,0.05); }
  .umoor-num { font-size: 11px; color: #c9a84c; font-weight: 600; margin-bottom: 4px; }
  .umoor-name { font-size: 12px; color: #e2d9c9; font-weight: 500; }
  .umoor-count { font-size: 11px; color: #6b7280; margin-top: 4px; }
  .empty-state { text-align: center; padding: 48px; color: #4b5563; }
  .empty-icon { font-size: 36px; margin-bottom: 12px; opacity: 0.4; }
  .empty-text { font-size: 14px; }
  .toast { position: fixed; bottom: 24px; right: 24px; z-index: 999; background: #111820; border-radius: 10px; padding: 14px 20px; font-size: 13px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 10px; animation: slideIn 0.3s ease; }
  .toast-success { border: 1px solid rgba(52,211,153,0.3); color: #34d399; }
  .toast-error { border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
  @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: none; opacity: 1; } }
  .actions-col { display: flex; gap: 8px; align-items: center; }
  .file-no { font-family: monospace; font-size: 12px; color: #c9a84c; }
  .section-divider { height: 1px; background: rgba(184,152,90,0.1); margin: 20px 0; }
  .section-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #c9a84c; margin-bottom: 12px; font-weight: 600; }
  .upload-zone { border: 2px dashed rgba(184,152,90,0.25); border-radius: 10px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.2s; background: rgba(184,152,90,0.02); }
  .upload-zone:hover, .upload-zone.drag-over { border-color: #c9a84c; background: rgba(201,168,76,0.05); }
  .upload-zone-icon { font-size: 28px; margin-bottom: 8px; opacity: 0.6; }
  .upload-zone-text { font-size: 13px; color: #9ca3af; }
  .upload-zone-sub { font-size: 11px; color: #4b5563; margin-top: 4px; }
  .attachments-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
  .attachment-item { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(184,152,90,0.1); border-radius: 8px; padding: 8px 12px; }
  .attachment-thumb { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; background: rgba(184,152,90,0.1); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; overflow: hidden; }
  .attachment-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .attachment-info { flex: 1; min-width: 0; }
  .attachment-name { font-size: 12px; color: #e2d9c9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .attachment-meta { font-size: 11px; color: #6b7280; }
  .attachment-remove { background: none; border: none; color: #6b7280; cursor: pointer; font-size: 16px; padding: 2px 6px; border-radius: 4px; width: auto; }
  .attachment-remove:hover { color: #f87171; background: rgba(239,68,68,0.08); }
  .attachment-view { background: none; border: 1px solid rgba(184,152,90,0.2); color: #c9a84c; cursor: pointer; font-size: 11px; padding: 3px 8px; border-radius: 4px; width: auto; }
  .attachment-view:hover { background: rgba(184,152,90,0.08); }
  .attach-chip { display: inline-flex; align-items: center; gap: 4px; background: rgba(201,168,76,0.1); color: #c9a84c; border-radius: 12px; padding: 2px 8px; font-size: 11px; border: 1px solid rgba(201,168,76,0.2); }
  .mumin-name-cell { display: flex; align-items: center; gap: 10px; }
  .lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 200; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 16px; }
  .lightbox img { max-width: 90vw; max-height: 80vh; border-radius: 8px; object-fit: contain; }
  .lightbox-name { color: #9ca3af; font-size: 13px; }
  .lightbox-close { position: absolute; top: 24px; right: 28px; background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 28px; width: auto; }
  .lightbox-close:hover { color: #fff; }
  .pdf-icon { background: rgba(239,68,68,0.15); color: #f87171; font-size: 11px; font-weight: 700; border-radius: 4px; padding: 2px 5px; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(201,168,76,0.3); border-top-color: #c9a84c; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-overlay { display: flex; align-items: center; justify-content: center; padding: 60px; gap: 12px; color: #6b7280; font-size: 14px; }

  /* Login page */
  .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0d1117; }
  .login-box { width: 400px; background: #111820; border: 1px solid rgba(184,152,90,0.2); border-radius: 20px; padding: 48px 40px; box-shadow: 0 30px 80px rgba(0,0,0,0.5); }
  .login-logo { text-align: center; margin-bottom: 36px; }
  .login-logo-arabic { font-family: 'Amiri', serif; font-size: 32px; color: #c9a84c; line-height: 1.2; }
  .login-logo-sub { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #4b5563; margin-top: 6px; }
  .login-title { font-size: 16px; font-weight: 600; color: #e2d9c9; margin-bottom: 24px; text-align: center; }
  .login-form { display: flex; flex-direction: column; gap: 16px; }
  .login-field { display: flex; flex-direction: column; gap: 6px; }
  .login-field label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; }
  .login-btn { background: #c9a84c; color: #0d1117; border: none; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Jost', sans-serif; transition: background 0.2s; margin-top: 8px; }
  .login-btn:hover:not(:disabled) { background: #dbb95d; }
  .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .login-error { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 10px 14px; color: #f87171; font-size: 12px; text-align: center; }
  .login-footer { text-align: center; margin-top: 24px; font-size: 11px; color: #374151; }
  /* User info in sidebar */
  .user-info { padding: 12px 16px; margin: 8px 12px; background: rgba(184,152,90,0.05); border: 1px solid rgba(184,152,90,0.1); border-radius: 10px; }
  .user-email { font-size: 11px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .user-role { font-size: 10px; color: #c9a84c; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .signout-btn { width: 100%; margin-top: 8px; background: transparent; border: 1px solid rgba(239,68,68,0.2); color: #f87171; border-radius: 6px; padding: 5px 10px; font-size: 11px; cursor: pointer; font-family: 'Jost', sans-serif; transition: all 0.2s; }
  .signout-btn:hover { background: rgba(239,68,68,0.08); }
  .error-banner { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; padding: 14px 20px; color: #f87171; font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
  /* Import/Export */
  .ie-modal { background: #111820; border: 1px solid rgba(184,152,90,0.2); border-radius: 16px; width: 500px; box-shadow: 0 25px 60px rgba(0,0,0,0.5); }
  .ie-tabs { display: flex; border-bottom: 1px solid rgba(184,152,90,0.1); }
  .ie-tab { flex: 1; padding: 14px; text-align: center; font-size: 13px; cursor: pointer; color: #6b7280; transition: all 0.2s; border: none; background: none; font-family: 'Jost', sans-serif; }
  .ie-tab.active { color: #c9a84c; border-bottom: 2px solid #c9a84c; }
  .ie-tab:hover:not(.active) { color: #e2d9c9; }
  .ie-body { padding: 24px; }
  .ie-option { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); border: 1px solid rgba(184,152,90,0.1); border-radius: 10px; padding: 16px 18px; margin-bottom: 10px; }
  .ie-option-info { display: flex; flex-direction: column; gap: 3px; }
  .ie-option-title { font-size: 13px; color: #e2d9c9; font-weight: 500; }
  .ie-option-desc { font-size: 11px; color: #6b7280; }
  .drop-zone { border: 2px dashed rgba(184,152,90,0.25); border-radius: 10px; padding: 28px; text-align: center; cursor: pointer; transition: all 0.2s; background: rgba(184,152,90,0.02); margin-top: 8px; }
  .drop-zone:hover { border-color: #c9a84c; background: rgba(201,168,76,0.05); }
  .drop-zone-icon { font-size: 28px; margin-bottom: 8px; opacity: 0.5; }
  .drop-zone-text { font-size: 13px; color: #9ca3af; }
  .drop-zone-sub { font-size: 11px; color: #4b5563; margin-top: 4px; }
  .import-preview { background: rgba(255,255,255,0.02); border: 1px solid rgba(184,152,90,0.1); border-radius: 10px; padding: 14px 18px; margin-top: 12px; font-size: 12px; color: #9ca3af; }
  .import-preview strong { color: #c9a84c; }
  .import-type-select { display: flex; gap: 8px; margin-bottom: 16px; }
  .import-type-btn { flex: 1; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid rgba(184,152,90,0.15); color: #6b7280; background: transparent; transition: all 0.2s; font-family: 'Jost', sans-serif; }
  .import-type-btn.active { background: rgba(184,152,90,0.1); color: #c9a84c; border-color: rgba(201,168,76,0.3); }
`;

// ── Small components ──────────────────────────────────────────────
function Spinner() { return <span className="spinner" />; }

function AttachmentThumb({ url, type, name }) {
  if (url && type?.startsWith("image/")) return <div className="attachment-thumb"><img src={url} alt={name} /></div>;
  if (type === "application/pdf") return <div className="attachment-thumb"><span className="pdf-icon">PDF</span></div>;
  return <div className="attachment-thumb">📄</div>;
}

function UploadZone({ onFiles, uploading }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  const handle = (fileList) => {
    const arr = Array.from(fileList);
    const readers = arr.map(f => new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res({ name: f.name, size: f.size, type: f.type, dataUrl: r.result });
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then(onFiles);
  };
  return (
    <div className={`upload-zone ${drag ? "drag-over" : ""}`}
      onClick={() => !uploading && ref.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}>
      <input ref={ref} type="file" accept="image/*,.pdf" multiple style={{ display: "none" }} onChange={e => handle(e.target.files)} />
      <div className="upload-zone-icon">{uploading ? <Spinner /> : "📎"}</div>
      <div className="upload-zone-text">{uploading ? "Uploading to cloud…" : "Click or drag files to attach"}</div>
      <div className="upload-zone-sub">JPG, PNG, TIFF (scans), PDF · stored in Supabase Storage</div>
    </div>
  );
}

function AttachmentsList({ attachments, onRemove, onView }) {
  if (!attachments?.length) return null;
  return (
    <div className="attachments-list">
      {attachments.map((att, i) => (
        <div className="attachment-item" key={i}>
          <AttachmentThumb url={att.url || att.dataUrl} type={att.type} name={att.name} />
          <div className="attachment-info">
            <div className="attachment-name">{att.name}</div>
            <div className="attachment-meta">{att.size ? (att.size / 1024).toFixed(1) + " KB" : ""} {att.uploading ? "· uploading…" : att.url ? "· ☁ saved" : ""}</div>
          </div>
          {(att.url || att.dataUrl) && att.type?.startsWith("image/") && (
            <button className="attachment-view" onClick={() => onView(att)}>View</button>
          )}
          {onRemove && <button className="attachment-remove" onClick={() => onRemove(i)}>×</button>}
        </div>
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
// ── Login Page ────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter email and password."); return; }
    setLoading(true); setError(null);
    try {
      const data = await sbSignIn(email, password);
      onLogin(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-arabic">حسيني محلّه</div>
          <div className="login-logo-sub">Husaini Mohallah · Database</div>
        </div>
        <div className="login-title">Sign in to continue</div>
        <div className="login-form">
          {error && <div className="login-error">{error}</div>}
          <div className="login-field">
            <label>Email</label>
            <input type="text" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey} placeholder="admin@example.com" autoFocus />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey} placeholder="••••••••" />
          </div>
          <button className="login-btn" onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </div>
        <div className="login-footer">Husaini Mohallah © 2025</div>
      </div>
    </div>
  );
}

// ── Export / Import utilities ─────────────────────────────────────
function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows, cols) {
  const header = cols.join(",");
  const lines = rows.map(r => cols.map(c => {
    const v = String(r[c] ?? "").replace(/"/g, '\"\"\"');
    return v.includes(",") || v.includes("\n") || v.includes('\"') ? `"${v}"` : v;
  }).join(","));
  return [header, ...lines].join("\n");
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const vals = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '\"') { inQ = !inQ; }
      else if (line[i] === "," && !inQ) { vals.push(cur); cur = ""; }
      else cur += line[i];
    }
    vals.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || "").trim()]));
  });
}

const MUMIN_COLS = ["its_number","name","age","gender","phone","email","address","status"];
const FILE_COLS  = ["file_no","umoor_type","year","title","description","status","date"];

function ImportExportModal({ onClose, muminData, filesData, onImportMumin, onImportFiles, importing }) {
  const [tab, setTab] = useState("export");
  const [importType, setImportType] = useState("mumin");
  const [preview, setPreview] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const fileRef = useRef();

  const exportMuminCSV = () => downloadBlob(toCSV(muminData, MUMIN_COLS), "mumin_data.csv", "text/csv");
  const exportFilesCSV = () => downloadBlob(toCSV(filesData, FILE_COLS), "umoor_files.csv", "text/csv");
  const exportMuminJSON = () => downloadBlob(JSON.stringify(muminData.map(r => { const o={}; MUMIN_COLS.forEach(c=>o[c]=r[c]); return o; }), null, 2), "mumin_data.json", "application/json");
  const exportFilesJSON = () => downloadBlob(JSON.stringify(filesData.map(r => { const o={}; FILE_COLS.forEach(c=>o[c]=r[c]); return o; }), null, 2), "umoor_files.json", "application/json");

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        let rows;
        if (file.name.endsWith(".json")) rows = JSON.parse(text);
        else rows = parseCSV(text);
        setParsedRows(rows);
        setPreview({ name: file.name, count: rows.length });
      } catch { setPreview({ error: "Could not parse file. Make sure it is a valid CSV or JSON." }); }
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (importType === "mumin") onImportMumin(parsedRows);
    else onImportFiles(parsedRows);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ie-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Import / Export</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="ie-tabs">
          <button className={`ie-tab ${tab === "export" ? "active" : ""}`} onClick={() => setTab("export")}>⬇ Export</button>
          <button className={`ie-tab ${tab === "import" ? "active" : ""}`} onClick={() => setTab("import")}>⬆ Import</button>
        </div>
        <div className="ie-body">
          {tab === "export" && (
            <>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Download your data as CSV (Excel-compatible) or JSON backup.</div>
              <div className="ie-option">
                <div className="ie-option-info">
                  <div className="ie-option-title">👤 Mumin Data</div>
                  <div className="ie-option-desc">{muminData.length} records · ITS, name, age, gender, phone…</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={exportMuminCSV}>CSV</button>
                  <button className="btn btn-ghost btn-sm" onClick={exportMuminJSON}>JSON</button>
                </div>
              </div>
              <div className="ie-option">
                <div className="ie-option-info">
                  <div className="ie-option-title">🗂 Umoor Files</div>
                  <div className="ie-option-desc">{filesData.length} records · file no, umoor type, year, title…</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={exportFilesCSV}>CSV</button>
                  <button className="btn btn-ghost btn-sm" onClick={exportFilesJSON}>JSON</button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#4b5563", marginTop: 16 }}>
                💡 CSV files open in Excel or Google Sheets. JSON is useful for backups.
              </div>
            </>
          )}
          {tab === "import" && (
            <>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>Import records from a CSV or JSON file. Existing records are not deleted — new rows are added.</div>
              <div className="import-type-select">
                <button className={`import-type-btn ${importType === "mumin" ? "active" : ""}`} onClick={() => { setImportType("mumin"); setPreview(null); setParsedRows([]); }}>👤 Mumin Data</button>
                <button className={`import-type-btn ${importType === "files" ? "active" : ""}`} onClick={() => { setImportType("files"); setPreview(null); setParsedRows([]); }}>🗂 Umoor Files</button>
              </div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
                Required columns:{" "}
                <span style={{ color: "#c9a84c", fontFamily: "monospace" }}>
                  {(importType === "mumin" ? MUMIN_COLS : FILE_COLS).join(", ")}
                </span>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.json" style={{ display: "none" }} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
              <div className="drop-zone" onClick={() => fileRef.current.click()}>
                <div className="drop-zone-icon">📂</div>
                <div className="drop-zone-text">Click to choose a CSV or JSON file</div>
                <div className="drop-zone-sub">Must match the column format above</div>
              </div>
              {preview && !preview.error && (
                <div className="import-preview">
                  <strong>{preview.name}</strong> — <strong>{preview.count} rows</strong> ready to import into{" "}
                  <strong>{importType === "mumin" ? "Mumin Data" : "Umoor Files"}</strong>.
                </div>
              )}
              {preview?.error && <div className="import-preview" style={{ color: "#f87171" }}>⚠ {preview.error}</div>}
              {parsedRows.length > 0 && (
                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-primary" onClick={confirmImport} disabled={importing}>
                    {importing ? <><Spinner /> Importing…</> : `Import ${parsedRows.length} rows ☁`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);   // { access_token, user }
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [muminData, setMuminData] = useState([]);
  const [filesData, setFilesData] = useState([]);
  const [attachmentsData, setAttachmentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedUmoor, setSelectedUmoor] = useState(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [formAttachments, setFormAttachments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [ieModal, setIeModal] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleLogin = (data) => {
    SESSION_TOKEN = data.access_token;
    setSession(data);
    localStorage.setItem("hm_session", JSON.stringify(data));
    loadAll();
  };

  const handleSignOut = async () => {
    await sbSignOut(session?.access_token);
    SESSION_TOKEN = null;
    setSession(null);
    localStorage.removeItem("hm_session");
    setMuminData([]); setFilesData([]); setAttachmentsData([]);
  };

  const handleImportMumin = async (rows) => {
    setImporting(true);
    let ok = 0;
    for (const r of rows) {
      try {
        await sbInsert('mumin_data', {
          its_number: r.its_number || '', name: r.name || '',
          age: r.age ? Number(r.age) : null, gender: r.gender || 'Male',
          phone: r.phone || '', email: r.email || '',
          address: r.address || '', status: r.status || 'Active',
        });
        ok++;
      } catch {}
    }
    await loadAll();
    setImporting(false); setIeModal(false);
    showToast(`Imported ${ok} of ${rows.length} mumin records ☁`);
  };

  const handleImportFiles = async (rows) => {
    setImporting(true);
    let ok = 0;
    for (const r of rows) {
      try {
        await sbInsert('umoor_files', {
          file_no: r.file_no || `HM-${r.year}-${String(Date.now()).slice(-3)}`,
          umoor_type: r.umoor_type || '', year: Number(r.year) || 2024,
          title: r.title || '', description: r.description || '',
          status: r.status || 'Active', date: r.date || '',
        });
        ok++;
      } catch {}
    }
    await loadAll();
    setImporting(false); setIeModal(false);
    showToast(`Imported ${ok} of ${rows.length} file records ☁`);
  };


  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  // ── Load all data ──
  const loadAll = async () => {
    setLoading(true); setDbError(null);
    try {
      const [mumin, files, atts] = await Promise.all([
        sbGet("mumin_data", "order=id.asc"),
        sbGet("umoor_files", "order=id.desc"),
        sbGet("attachments", "order=id.asc"),
      ]);
      setMuminData(mumin || []);
      setFilesData(files || []);
      setAttachmentsData(atts || []);
    } catch (e) {
      setDbError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Restore session from localStorage on page load
    const stored = localStorage.getItem("hm_session");
    if (stored) {
      try {
        const s = JSON.parse(stored);
        // Verify token still valid
        sbGetUser(s.access_token).then(user => {
          if (user) {
            SESSION_TOKEN = s.access_token;
            setSession(s);
            loadAll();
          } else {
            localStorage.removeItem("hm_session");
          }
          setAuthLoading(false);
        });
      } catch {
        localStorage.removeItem("hm_session");
        setAuthLoading(false);
      }
    } else {
      setAuthLoading(false);
    }
  }, []);

  const getFileAttachments = (fileId) => attachmentsData.filter(a => a.file_id === fileId);

  // ── Modal helpers ──
  const openModal = (type, mode, record = null) => {
    setForm(record ? { ...record } : { year: selectedYear, status: "Active" });
    if (type === "file" && record) setFormAttachments(getFileAttachments(record.id));
    else setFormAttachments([]);
    setModal({ type, mode, record });
  };
  const closeModal = () => { setModal(null); setForm({}); setFormAttachments([]); };

  // ── Upload a single file to storage ──
  const uploadOne = async (att, folder) => {
    if (att.url) return att; // already uploaded
    const ext = att.name.split(".").pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const url = await uploadFile(att, path);
    return { ...att, url, dataUrl: undefined };
  };

  // ── Save mumin ──
  const saveMumin = async () => {
    setSaving(true);
    try {
      const payload = {
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
      showToast(modal.mode === "add" ? "Mumin record saved to cloud ☁" : "Record updated");
      await loadAll(); closeModal();
    } catch (e) { showToast("Error: " + e.message, "error"); }
    setSaving(false); setUploading(false);
  };

  // ── Save file ──
  const saveFile = async () => {
    setSaving(true);
    try {
      const fileNo = form.file_no || `HM-${form.year}-${String(Date.now()).slice(-3)}`;
      const payload = {
        file_no: fileNo,
        umoor_type: form.umoor_type || "",
        year: Number(form.year) || 2024,
        title: form.title || "",
        description: form.description || "",
        status: form.status || "Active",
        date: form.date || "",
      };

      let fileId;
      if (modal.mode === "add") {
        const result = await sbInsert("umoor_files", payload);
        // sbInsert returns array of created rows
        fileId = Array.isArray(result) ? result[0].id : result.id;
      } else {
        fileId = form.id;
        await sbUpdate("umoor_files", fileId, payload);
        // delete removed attachments
        const existingIds = attachmentsData.filter(a => a.file_id === fileId).map(a => a.id);
        const keptIds = formAttachments.filter(a => a.id).map(a => a.id);
        for (const id of existingIds) {
          if (!keptIds.includes(id)) await sbDelete("attachments", id);
        }
      }

      // upload new attachments (ones without an id are newly added)
      const newAtts = formAttachments.filter(a => !a.id);
      if (newAtts.length > 0) {
        setUploading(true);
        for (const att of newAtts) {
          const uploaded = await uploadOne(att, `files/${fileId}`);
          await sbInsert("attachments", {
            file_id: fileId, name: uploaded.name,
            size: uploaded.size, type: uploaded.type, url: uploaded.url,
          });
        }
        setUploading(false);
      }

      showToast(modal.mode === "add" ? "File saved to cloud ☁" : "File updated");
      await loadAll(); closeModal();
    } catch (e) { showToast("Error: " + e.message, "error"); setUploading(false); }
    setSaving(false);
  };

  const deleteRecord = async (type, id) => {
    try {
      await sbDelete(type === "mumin" ? "mumin_data" : "umoor_files", id);
      showToast("Deleted");
      await loadAll();
    } catch (e) { showToast("Error: " + e.message, "error"); }
  };

  const handleNewAttachments = (files) => setFormAttachments(a => [...a, ...files]);

  // ── Filtered views ──
  const filteredMumin = muminData.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) || m.its_number?.includes(search)
  );
  const filteredFiles = filesData.filter(f =>
    (selectedYear ? f.year === selectedYear : true) &&
    (selectedUmoor ? f.umoor_type === selectedUmoor : true) &&
    (search ? f.title?.toLowerCase().includes(search.toLowerCase()) || f.file_no?.includes(search) : true)
  );
  const umoorStats = UMOOR_TYPES.map((u, i) => ({
    name: u, num: i + 1,
    count: filesData.filter(f => f.umoor_type === u && f.year === selectedYear).length,
  }));
  const totalAtts = attachmentsData.length;

  return (
    <>
      <style>{styles}</style>
      {authLoading ? (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1117", color: "#6b7280", gap: 12, fontSize: 14 }}>
          <span className="spinner" /> Loading…
        </div>
      ) : !session ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
      <div className="app">
        <div className="layout">
          <aside className="sidebar">
            <div className="sidebar-logo">
              <div className="logo-arabic">حسيني محلّه</div>
              <div className="logo-sub">Husaini Mohallah · Database</div>
              <div className="cloud-badge">☁ Supabase Cloud</div>
            </div>
            <nav className="nav">
              <div className="nav-label">Main</div>
              {[
                { id: "dashboard", icon: "◈", label: "Dashboard" },
                { id: "files", icon: "🗂", label: "Umoor Files" },
                { id: "mumin", icon: "👤", label: "Mumin Data" },
              ].map(n => (
                <div key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`}
                  onClick={() => { setPage(n.id); setSearch(""); setSelectedUmoor(null); }}>
                  <span className="nav-icon">{n.icon}</span> {n.label}
                </div>
              ))}
            <div style={{ padding: "8px 12px" }}>
              <div
                className="nav-item"
                onClick={() => setIeModal(true)}
                style={{ color: "#c9a84c", borderColor: "rgba(201,168,76,0.15)" }}
              >
                <span className="nav-icon">⇅</span> Import / Export
              </div>
            </div>
            </nav>
            <div style={{ padding: "0 12px 12px" }}>
              <div className="user-info">
                <div className="user-role">● Signed In</div>
                <div className="user-email">{session?.user?.email}</div>
                <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
              </div>
            </div>
            <div className="sidebar-footer">Husaini Mohallah © 2025</div>
          </aside>

          <main className="main">
            {dbError && (
              <div className="error-banner">
                ⚠ Database error: {dbError} —
                <button className="btn btn-ghost btn-sm" onClick={loadAll} style={{ marginLeft: 8 }}>Retry</button>
              </div>
            )}

            {/* DASHBOARD */}
            {page === "dashboard" && (
              <>
                <div className="page-header">
                  <div className="page-title">Dashboard</div>
                  <div className="page-sub">Live data from Supabase · {new Date().toLocaleDateString()}</div>
                </div>
                {loading ? <div className="loading-overlay"><Spinner /> Loading from cloud…</div> : (
                  <>
                    <div className="stats-grid">
                      {[
                        { label: "Total Mumineen", value: muminData.length, desc: "Registered members" },
                        { label: "Total Files", value: filesData.length, desc: "All years combined" },
                        { label: "Active Files", value: filesData.filter(f => f.status === "Active").length, desc: "Currently open" },
                        { label: "Attachments", value: totalAtts, desc: "Scans & photos in cloud" },
                      ].map(s => (
                        <div className="stat-card" key={s.label}>
                          <div className="stat-label">{s.label}</div>
                          <div className="stat-value">{s.value}</div>
                          <div className="stat-desc">{s.desc}</div>
                        </div>
                      ))}
                    </div>
                    <div className="year-tabs">
                      {YEARS.map(y => <button key={y} className={`year-tab ${selectedYear === y ? "active" : ""}`} onClick={() => setSelectedYear(y)}>{y}</button>)}
                    </div>
                    <div className="card">
                      <div className="card-header">
                        <span className="card-title">12 Umoor — {selectedYear}</span>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{filesData.filter(f => f.year === selectedYear).length} files this year</span>
                      </div>
                      <div className="card-body" style={{ padding: 20 }}>
                        <div className="umoor-grid">
                          {umoorStats.map(u => (
                            <div key={u.name} className="umoor-card" onClick={() => { setSelectedUmoor(u.name); setPage("files"); }}>
                              <div className="umoor-num">File {String(u.num).padStart(2, "0")}</div>
                              <div className="umoor-name">{u.name}</div>
                              <div className="umoor-count">{u.count} file{u.count !== 1 ? "s" : ""}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* FILES */}
            {page === "files" && (
              <>
                <div className="page-header">
                  <div className="page-title">Umoor Files</div>
                  <div className="page-sub">Documents, scans, and records — stored in Supabase</div>
                </div>
                <div className="year-tabs">
                  <button className={`year-tab ${!selectedYear ? "active" : ""}`} onClick={() => setSelectedYear(null)}>All Years</button>
                  {YEARS.map(y => <button key={y} className={`year-tab ${selectedYear === y ? "active" : ""}`} onClick={() => setSelectedYear(y)}>{y}</button>)}
                </div>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Files ({filteredFiles.length})</span>
                    <button className="btn btn-primary" onClick={() => openModal("file", "add")}>+ New File</button>
                  </div>
                  <div className="toolbar">
                    <input style={{ width: 220 }} placeholder="Search files…" value={search} onChange={e => setSearch(e.target.value)} />
                    <select value={selectedUmoor || ""} onChange={e => setSelectedUmoor(e.target.value || null)} style={{ width: 220 }}>
                      <option value="">All Umoor</option>
                      {UMOOR_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={loadAll}>{loading ? <Spinner /> : "↻ Refresh"}</button>
                  </div>
                  <div className="card-body">
                    {loading ? <div className="loading-overlay"><Spinner /> Loading…</div> : filteredFiles.length === 0 ? (
                      <div className="empty-state"><div className="empty-icon">🗂</div><div className="empty-text">No files found</div></div>
                    ) : (
                      <table>
                        <thead><tr><th>File No.</th><th>Title</th><th>Umoor</th><th>Year</th><th>Date</th><th>Attachments</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                          {filteredFiles.map(f => {
                            const atts = getFileAttachments(f.id);
                            return (
                              <tr key={f.id}>
                                <td><span className="file-no">{f.file_no}</span></td>
                                <td style={{ fontWeight: 500 }}>{f.title}</td>
                                <td style={{ fontSize: 12, color: "#9ca3af" }}>{f.umoor_type}</td>
                                <td>{f.year}</td>
                                <td style={{ fontSize: 12, color: "#6b7280" }}>{f.date}</td>
                                <td>{atts.length > 0 ? <span className="attach-chip">📎 {atts.length}</span> : <span style={{ color: "#4b5563", fontSize: 12 }}>—</span>}</td>
                                <td><span className={`badge badge-${f.status?.toLowerCase()}`}>{f.status}</span></td>
                                <td><div className="actions-col">
                                  <button className="btn btn-ghost btn-sm" onClick={() => openModal("file", "edit", f)}>Edit</button>
                                  <button className="btn btn-danger" onClick={() => deleteRecord("file", f.id)}>Del</button>
                                </div></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* MUMIN */}
            {page === "mumin" && (
              <>
                <div className="page-header">
                  <div className="page-title">Mumin Data</div>
                  <div className="page-sub">Registered members — stored in Supabase</div>
                </div>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Members ({filteredMumin.length})</span>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="btn btn-ghost btn-sm" onClick={loadAll}>{loading ? <Spinner /> : "↻ Refresh"}</button>
                      <button className="btn btn-primary" onClick={() => openModal("mumin", "add")}>+ Add Mumin</button>
                    </div>
                  </div>
                  <div className="toolbar">
                    <input style={{ width: 260 }} placeholder="Search by name or ITS…" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <div className="card-body">
                    {loading ? <div className="loading-overlay"><Spinner /> Loading…</div> : filteredMumin.length === 0 ? (
                      <div className="empty-state"><div className="empty-icon">👤</div><div className="empty-text">No records found</div></div>
                    ) : (
                      <table>
                        <thead><tr><th>ITS No.</th><th>Name</th><th>Age</th><th>Gender</th><th>Phone</th><th>Address</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                          {filteredMumin.map(m => (
                            <tr key={m.id}>
                              <td><span className="file-no">{m.its_number}</span></td>
                              <td>
                                <div className="mumin-name-cell">
<span style={{ fontWeight: 500 }}>{m.name}</span>
                                </div>
                              </td>
                              <td>{m.age}</td>
                              <td><span className={`badge badge-${m.gender?.toLowerCase()}`}>{m.gender}</span></td>
                              <td style={{ fontSize: 12, color: "#9ca3af" }}>{m.phone}</td>
                              <td style={{ fontSize: 12, color: "#6b7280" }}>{m.address}</td>
                              <td><span className={`badge badge-${m.status?.toLowerCase()}`}>{m.status}</span></td>
                              <td><div className="actions-col">
                                <button className="btn btn-ghost btn-sm" onClick={() => openModal("mumin", "edit", m)}>Edit</button>
                                <button className="btn btn-danger" onClick={() => deleteRecord("mumin", m.id)}>Del</button>
                              </div></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>

        {/* MODAL */}
        {modal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">{modal.mode === "add" ? "Add" : "Edit"} {modal.type === "mumin" ? "Mumin Record" : "Umoor File"}</div>
                <button className="modal-close" onClick={closeModal}>×</button>
              </div>
              <div className="modal-body">
                {modal.type === "mumin" ? (
                  <>
                    <div className="form-grid">
                      <div className="form-group"><label>ITS Number</label><input value={form.its_number || ""} onChange={e => setForm(f => ({ ...f, its_number: e.target.value }))} placeholder="e.g. 10001" /></div>
                      <div className="form-group"><label>Status</label>
                        <select value={form.status || "Active"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                          <option>Active</option><option>Inactive</option>
                        </select>
                      </div>
                      <div className="form-group full"><label>Full Name</label><input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter full name" /></div>
                      <div className="form-group"><label>Age</label><input type="number" value={form.age || ""} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} /></div>
                      <div className="form-group"><label>Gender</label>
                        <select value={form.gender || "Male"} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                          <option>Male</option><option>Female</option>
                        </select>
                      </div>
                      <div className="form-group"><label>Phone</label><input value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                      <div className="form-group"><label>Email</label><input value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                      <div className="form-group full"><label>Address</label><input value={form.address || ""} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                    </div>

                  </>
                ) : (
                  <>
                    <div className="form-grid">
                      <div className="form-group"><label>Year</label>
                        <select value={form.year || 2024} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}>
                          {YEARS.map(y => <option key={y}>{y}</option>)}
                        </select>
                      </div>
                      <div className="form-group"><label>Status</label>
                        <select value={form.status || "Active"} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                          <option>Active</option><option>Closed</option><option>Pending</option>
                        </select>
                      </div>
                      <div className="form-group full"><label>Umoor Type</label>
                        <select value={form.umoor_type || ""} onChange={e => setForm(f => ({ ...f, umoor_type: e.target.value }))}>
                          <option value="">Select Umoor</option>
                          {UMOOR_TYPES.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="form-group full"><label>File Title</label><input value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Enter file title" /></div>
                      <div className="form-group"><label>Date</label><input type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                      <div className="form-group"><label>File No. (auto if blank)</label><input value={form.file_no || ""} onChange={e => setForm(f => ({ ...f, file_no: e.target.value }))} placeholder="Auto-generated" /></div>
                      <div className="form-group full"><label>Description</label><textarea value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Notes or description" /></div>
                    </div>
                    <div className="section-divider" />
                    <div className="section-label">📎 Attachments — Scans & Photos</div>
                    <UploadZone onFiles={handleNewAttachments} uploading={uploading} />
                    <AttachmentsList
                      attachments={formAttachments}
                      onRemove={i => setFormAttachments(a => a.filter((_, idx) => idx !== i))}
                      onView={att => setLightbox({ url: att.url || att.dataUrl, name: att.name })}
                    />
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={closeModal} disabled={saving}>Cancel</button>
                <button className="btn btn-primary" onClick={modal.type === "mumin" ? saveMumin : saveFile} disabled={saving}>
                  {saving ? <><Spinner /> Saving…</> : "Save to Cloud ☁"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IMPORT/EXPORT MODAL */}
        {ieModal && (
          <ImportExportModal
            onClose={() => setIeModal(false)}
            muminData={muminData}
            filesData={filesData}
            onImportMumin={handleImportMumin}
            onImportFiles={handleImportFiles}
            importing={importing}
          />
        )}

        {/* LIGHTBOX */}
        {lightbox && (
          <div className="lightbox" onClick={() => setLightbox(null)}>
            <button className="lightbox-close" onClick={() => setLightbox(null)}>×</button>
            <img src={lightbox.url} alt={lightbox.name} onClick={e => e.stopPropagation()} />
            <div className="lightbox-name">{lightbox.name}</div>
          </div>
        )}

        {toast && <div className={`toast toast-${toast.type}`}>{toast.type === "success" ? "✓" : "⚠"} {toast.msg}</div>}
      </div>
    </>
  );
}
