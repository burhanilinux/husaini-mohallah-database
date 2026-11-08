// ── Supabase configuration / access layer ─────────────────────────
export const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export class SupabaseError extends Error {
  constructor(message, status, code, details) {
    super(message); this.name = "SupabaseError";
    this.status = status || 0; this.code = code || null; this.details = details || null;
  }
}

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error("Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file or Vercel project settings.");
}

export function getSession() {
  try {
    var raw = localStorage.getItem("hm_session");
    if (!raw) return null;
    var session = JSON.parse(raw);
    return session && session.access_token ? session : null;
  } catch (_e) { return null; }
}

export function clearStoredSession() {
  try { localStorage.removeItem("hm_session"); } catch (_e) {}
  try { window.dispatchEvent(new CustomEvent("hm-auth-expired")); } catch (_e2) {}
}

export function getToken() {
  var session = getSession();
  return session ? session.access_token : SUPABASE_ANON;
}

function getHeaders(extra) {
  return Object.assign({
    "Content-Type": "application/json", "apikey": SUPABASE_ANON,
    "Authorization": "Bearer " + getToken(), "Prefer": "return=representation",
  }, extra || {});
}

async function readError(res) {
  var text = "Request failed";
  try { text = await res.text(); } catch (_e) {}
  var data = null;
  try { data = JSON.parse(text); } catch (_e2) {}
  var message = data && (data.message || data.error_description || data.msg || data.error) || text || res.statusText;
  return new SupabaseError(message, res.status, data && data.code, data && data.details);
}

let refreshing = null;
// Exchange the stored refresh_token for a new access token (one shared in-flight call).
async function refreshSession() {
  if (refreshing) return refreshing;
  refreshing = (async function () {
    var session = getSession();
    if (!session || !session.refresh_token) return null;
    try {
      var res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (!res.ok) return null;
      var next = await res.json();
      if (!next || !next.access_token) return null;
      var merged = Object.assign({}, session, next);
      try { localStorage.setItem("hm_session", JSON.stringify(merged)); } catch { /* storage unavailable; session still returned */ }
      return merged;
    } catch { return null; }
  })();
  try { return await refreshing; } finally { refreshing = null; }
}

async function request(url, options, retryable, alreadyRefreshed) {
  var attempts = retryable ? 2 : 1;
  var lastError = null;
  for (var attempt = 0; attempt < attempts; attempt++) {
    try {
      var res = await fetch(url, options);
      if (res.ok) return res;
      var error = await readError(res);
      if (res.status === 401 && !alreadyRefreshed) {
        var fresh = await refreshSession();
        if (fresh && fresh.access_token) {
          var retryOptions = Object.assign({}, options, { headers: Object.assign({}, options.headers, { "Authorization": "Bearer " + fresh.access_token }) });
          return request(url, retryOptions, retryable, true);
        }
      }
      if (res.status === 401) clearStoredSession();
      if (res.status >= 500 && attempt + 1 < attempts) {
        await new Promise(function (resolve) { setTimeout(resolve, 300 * (attempt + 1)); });
        lastError = error; continue;
      }
      throw error;
    } catch (e) {
      lastError = e;
      if (e && e.status >= 400 && e.status < 500) throw e;
      if (attempt + 1 >= attempts) throw e;
      await new Promise(function (resolve) { setTimeout(resolve, 300 * (attempt + 1)); });
    }
  }
  throw lastError || new SupabaseError("Request failed");
}

function buildRestUrl(table, params) {
  if (!table || !/^[a-zA-Z0-9_]+$/.test(table)) throw new Error("Invalid Supabase table name");
  return SUPABASE_URL + "/rest/v1/" + table + (params ? "?" + params : "");
}

// Explicit paged read for large directory/search screens.
export async function sbGetPage(table, params, page, pageSize) {
  var size = Math.max(1, Math.min(Number(pageSize) || 100, 1000));
  var p = Math.max(0, Number(page) || 0);
  var offset = p * size;
  var res = await request(buildRestUrl(table, params), {
    headers: Object.assign({}, getHeaders(), { "Range": offset + "-" + (offset + size - 1) }),
  }, true);
  var rows = await res.json();
  return { rows: Array.isArray(rows) ? rows : [], page: p, pageSize: size, hasMore: Array.isArray(rows) && rows.length === size };
}

export async function sbGetCount(table, params) {
  var res = await request(buildRestUrl(table, params), {
    method: "HEAD", headers: Object.assign({}, getHeaders(), { "Prefer": "count=exact" }),
  }, true);
  var range = res.headers.get("Content-Range") || "";
  var match = range.match(/\/([0-9]+)$/);
  return match ? Number(match[1]) : null;
}

// Backwards-compatible full read. Prefer sbGetPage for large interactive lists.
export async function sbGet(table, params) {
  var baseUrl = buildRestUrl(table, params), pageSize = 1000, offset = 0, all = [];
  while (true) {
    var res = await request(baseUrl, { headers: Object.assign({}, getHeaders(), { "Range": offset + "-" + (offset + pageSize - 1) }) }, true);
    var rows = await res.json();
    if (!Array.isArray(rows)) return rows;
    all = all.concat(rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

export async function sbInsert(table, body) {
  var res = await request(buildRestUrl(table), { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }, false);
  return res.json();
}

export async function sbUpsert(table, body, onConflict) {
  if (!onConflict || !String(onConflict).trim()) throw new Error("sbUpsert requires an explicit unique conflict target");
  var h = Object.assign({}, getHeaders(), { "Prefer": "return=representation,resolution=merge-duplicates" });
  try {
    var res = await request(buildRestUrl(table, "on_conflict=" + encodeURIComponent(onConflict)), { method: "POST", headers: h, body: JSON.stringify(body) }, false);
    return res.json();
  } catch (e) {
    if (e && e.code === "42P10") throw new SupabaseError("Upsert conflict target is not backed by a UNIQUE/EXCLUDE constraint: " + onConflict, e.status, e.code, e.details);
    throw e;
  }
}

export async function sbUpdate(table, id, body) {
  var res = await request(buildRestUrl(table, "id=eq." + encodeURIComponent(id)), { method: "PATCH", headers: getHeaders(), body: JSON.stringify(body) }, false);
  return res.json();
}

export async function sbDelete(table, id) {
  await request(buildRestUrl(table, "id=eq." + encodeURIComponent(id)), { method: "DELETE", headers: Object.assign({}, getHeaders(), { Prefer: "return=minimal" }) }, false);
}

function requireFilter(filterQuery) {
  if (!filterQuery || !/[a-z_]+=(eq|in|is|lt|gt|lte|gte|neq)\./i.test(filterQuery)) throw new Error("Refusing a bulk write without a filter");
}

export async function sbDeleteWhere(table, filterQuery) {
  requireFilter(filterQuery);
  await request(buildRestUrl(table, filterQuery), { method: "DELETE", headers: Object.assign({}, getHeaders(), { Prefer: "return=minimal" }) }, false);
}

export async function sbUpdateWhere(table, filterQuery, body) {
  requireFilter(filterQuery);
  var res = await request(buildRestUrl(table, filterQuery), { method: "PATCH", headers: getHeaders(), body: JSON.stringify(body) }, false);
  return res.json();
}

export async function logActivity(action, entityType, entityName, userEmail) {
  try {
    await sbInsert("activity_log", { action, entity_type: entityType, entity_name: entityName || "", user_email: userEmail || "Unknown" });
  } catch (e) { console.warn("Activity log failed", e); }
}

// Resolve a stored upload URL to a short-lived authenticated URL. The
// uploads bucket is private, so /object/public URLs cannot display its files.
export async function getStorageDisplayUrl(photoUrl) {
  if (!photoUrl) return null;
  var marker = "/storage/v1/object/public/uploads/";
  var index = String(photoUrl).indexOf(marker);
  if (index < 0) return photoUrl; // Preserve externally hosted legacy photos.
  var path = String(photoUrl).slice(index + marker.length);
  if (!path || path.split("/").some(function (part) { return part === "." || part === ".."; })) return null;
  var res = await request(SUPABASE_URL + "/storage/v1/object/sign/uploads/" + path, {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + getToken(), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 3600 }),
  }, true);
  var data = await res.json();
  if (!data || !data.signedURL) throw new Error("Supabase did not return a signed photo URL.");
  return data.signedURL.startsWith("http") ? data.signedURL : SUPABASE_URL + "/storage/v1" + data.signedURL;
}

export async function uploadStorage(file, path) {
  var res2 = await fetch(file.dataUrl), blob = await res2.blob();
  await request(SUPABASE_URL + "/storage/v1/object/uploads/" + path, {
    method: "POST", headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + getToken(), "Content-Type": blob.type }, body: blob,
  }, false);
  // Store a stable object reference; display components request fresh signed URLs.
  return SUPABASE_URL + "/storage/v1/object/public/uploads/" + path;
}

export async function sbSignIn(email, password) {
  var res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", { method: "POST", headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON }, body: JSON.stringify({ email, password }) });
  var data = await res.json();
  if (!res.ok) throw new SupabaseError(data.error_description || data.msg || "Login failed", res.status, data.code, data);
  return data;
}

export async function sbSignOut(token) {
  try { await fetch(SUPABASE_URL + "/auth/v1/logout", { method: "POST", headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + (token || getToken()) } }); }
  finally { clearStoredSession(); }
}

export async function sbGetUser(token) {
  var res = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + (token || getToken()) } });
  if (!res.ok) return null;
  return res.json();
}
