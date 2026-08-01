// ── Supabase configuration ────────────────────────────────────────
export const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and " +
    "VITE_SUPABASE_ANON_KEY in your .env file or Vercel project settings."
  );
}

// ── Token helper (reads from localStorage on every call) ─────────
export function getToken() {
  try {
    var s = localStorage.getItem("hm_session");
    if (s) { var p = JSON.parse(s); return p.access_token || SUPABASE_ANON; }
  } catch (_e) {}
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

// ── CRUD helpers ──────────────────────────────────────────────────
export async function sbGet(table, params) {
  var url = SUPABASE_URL + "/rest/v1/" + table + "?" + (params || "");
  var res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function sbInsert(table, body) {
  var res = await fetch(SUPABASE_URL + "/rest/v1/" + table, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function sbUpdate(table, id, body) {
  var res = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?id=eq." + id, {
    method: "PATCH", headers: getHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function sbDelete(table, id) {
  var h = Object.assign({}, getHeaders(), { Prefer: "return=minimal" });
  var res = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?id=eq." + id, {
    method: "DELETE", headers: h,
  });
  if (!res.ok) throw new Error(await res.text());
}

// Bulk update matching a raw PostgREST filter (e.g. "sub_sector_id=eq.5"
// or "sub_sector_id=in.(5,6,7)") — used to clean up dependent records
// (like clearing an FK-style reference) when a parent row is deleted.
export async function sbUpdateWhere(table, filterQuery, body) {
  var res = await fetch(SUPABASE_URL + "/rest/v1/" + table + "?" + filterQuery, {
    method: "PATCH", headers: getHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function logActivity(action, entityType, entityName, userEmail) {
  try {
    await sbInsert("activity_log", {
      action, entity_type: entityType,
      entity_name: entityName || "",
      user_email: userEmail || "Unknown",
    });
  } catch (_e) { /* never block the UI on a log failure */ }
}

export async function uploadStorage(file, path) {
  var res2  = await fetch(file.dataUrl);
  var blob  = await res2.blob();
  var res   = await fetch(SUPABASE_URL + "/storage/v1/object/uploads/" + path, {
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

// ── Auth helpers ──────────────────────────────────────────────────
export async function sbSignIn(email, password) {
  var res  = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
    body: JSON.stringify({ email, password }),
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Login failed");
  return data;
}

export async function sbSignOut(token) {
  await fetch(SUPABASE_URL + "/auth/v1/logout", {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + token },
  });
}

export async function sbGetUser(token) {
  var res = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + token },
  });
  if (!res.ok) return null;
  return res.json();
}
