// Private-bucket photo access.
// photo_url may hold a legacy public URL (".../object/public/uploads/<path>") or a bare
// storage path. Either way we extract the path and ask Storage for a short-lived signed
// URL. Requests made in the same tick are batched into ONE call, so a list with hundreds
// of avatars costs a single round-trip.
import { SUPABASE_URL, SUPABASE_ANON, getToken } from "./supabase.js";

var BUCKET = "uploads";
var PUBLIC_MARK = "/storage/v1/object/public/" + BUCKET + "/";
var TTL_SECONDS = 3600;
var cache = new Map();   // path -> { url, exp }
var queue = new Map();   // path -> [resolve, ...]
var timer = null;

export function photoPath(value) {
  if (!value) return null;
  var s = String(value);
  var i = s.indexOf(PUBLIC_MARK);
  if (i >= 0) {
    var rest = s.slice(i + PUBLIC_MARK.length).split("?")[0];
    try { return decodeURIComponent(rest); } catch { return rest; }
  }
  if (/^https?:/i.test(s)) return null; // external URL: leave untouched
  return s.replace(/^\/+/, "");
}

async function flush() {
  timer = null;
  var batch = queue;
  queue = new Map();
  var paths = Array.from(batch.keys());
  var signed = {};
  try {
    var res = await fetch(SUPABASE_URL + "/storage/v1/object/sign/" + BUCKET, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON, "Authorization": "Bearer " + getToken() },
      body: JSON.stringify({ expiresIn: TTL_SECONDS, paths: paths }),
    });
    if (res.ok) {
      var rows = await res.json();
      (Array.isArray(rows) ? rows : []).forEach(function (r) {
        if (r && r.path && r.signedURL) signed[r.path] = SUPABASE_URL + "/storage/v1" + r.signedURL;
      });
    }
  } catch { /* network error: callers fall back to the stored value */ }
  paths.forEach(function (p) {
    var url = signed[p] || null;
    if (url) cache.set(p, { url: url, exp: Date.now() + (TTL_SECONDS - 300) * 1000 });
    batch.get(p).forEach(function (done) { done(url); });
  });
}

// Resolves to a displayable URL, or null when signing failed.
export function getPhotoUrl(value) {
  var path = photoPath(value);
  if (!path) return Promise.resolve(value || null);
  var hit = cache.get(path);
  if (hit && hit.exp > Date.now()) return Promise.resolve(hit.url);
  return new Promise(function (resolve) {
    if (!queue.has(path)) queue.set(path, []);
    queue.get(path).push(resolve);
    if (!timer) timer = setTimeout(flush, 20);
  });
}
