// Umoor Marafiq Burhaniyah (UMB) — per-person document storage.
// Rows live in public.umb_documents; files live in the private "umb-documents" bucket
// and are only ever opened through short-lived signed URLs.
import {
  SUPABASE_URL, SUPABASE_ANON, getToken, refreshSession,
  sbGet, sbInsert, sbUpdate, sbDelete, logActivity,
} from "./supabase.js";

export var UMB_BUCKET = "umb-documents";
export var MAX_PDF_BYTES = 5 * 1024 * 1024;
export var MAX_IMAGE_BYTES = 25 * 1024 * 1024; // before compression
var ALLOWED = /^(image\/(jpeg|png|webp)|application\/pdf)$/i;

// ── Reads ────────────────────────────────────────────────────────
export function listDocumentTypes() {
  return sbGet("umb_document_types", "order=sort_order.asc,name.asc");
}

// Documents are only ever fetched for the one person who has been selected.
export function listDocumentsForPerson(muminId) {
  return sbGet("umb_documents", "mumin_id=eq." + encodeURIComponent(muminId) + "&select=*&order=created_at.desc");
}

export async function addDocumentType(name, isRequired, userEmail) {
  var clean = String(name || "").trim();
  if (!clean) throw new Error("Enter a document type name.");
  var rows = await sbInsert("umb_document_types", { name: clean, is_required: !!isRequired, sort_order: 50 });
  await logActivity("create", "umb_type", clean, userEmail);
  return Array.isArray(rows) ? rows[0] : rows;
}

export function setTypeRequired(typeId, isRequired) {
  return sbUpdate("umb_document_types", typeId, { is_required: !!isRequired });
}

// ── Authenticated storage helper (retries once after a token refresh) ──
async function storageFetch(path, options) {
  async function go(token) {
    var headers = Object.assign({ apikey: SUPABASE_ANON, Authorization: "Bearer " + token }, options.headers || {});
    return fetch(SUPABASE_URL + "/storage/v1/" + path, Object.assign({}, options, { headers: headers }));
  }
  var res = await go(getToken());
  if (res.status === 401) {
    var fresh = await refreshSession();
    if (fresh && fresh.access_token) res = await go(fresh.access_token);
  }
  return res;
}

function safeName(name) {
  var s = String(name || "file").normalize("NFKD").replace(/[^\w.\-]+/g, "_").replace(/^_+|_+$/g, "");
  return (s || "file").slice(-80);
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

// ── Image compression: keeps scans readable at roughly 200–400 KB ──
export async function prepareFile(file, maxDimension) {
  if (!file) throw new Error("Choose a file first.");
  if (!ALLOWED.test(file.type)) throw new Error("Only JPG, PNG, WebP or PDF files are allowed.");
  if (file.type === "application/pdf") {
    if (file.size > MAX_PDF_BYTES) throw new Error("PDF is " + (file.size / 1048576).toFixed(1) + " MB. Keep PDFs under 5 MB (compress or scan at lower quality).");
    return { blob: file, name: safeName(file.name), type: "application/pdf" };
  }
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image is larger than 25 MB.");
  var max = maxDimension || 1600;
  try {
    if (typeof createImageBitmap !== "function") throw new Error("no bitmap support");
    var bitmap = await createImageBitmap(file);
    var scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (bitmap.close) bitmap.close();
    var out = await new Promise(function (resolve) { canvas.toBlob(resolve, "image/webp", 0.8); });
    if (out && out.size < file.size) {
      return { blob: out, name: safeName(file.name).replace(/\.\w+$/, "") + ".webp", type: "image/webp" };
    }
  } catch (_e) { /* fall through to the original file */ }
  return { blob: file, name: safeName(file.name), type: file.type };
}

// ── Upload: file first, then the row; the file is removed if the row fails ──
export async function uploadDocument(opts) {
  var person = opts.person, typeId = opts.typeId, file = opts.file;
  if (!person || !person.id) throw new Error("Choose a person first.");
  if (!typeId) throw new Error("Choose a document type.");
  var prepared = await prepareFile(file);
  var folder = String(person.its_id || person.its_number || person.id);
  var path = folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "-" + prepared.name;

  var up = await storageFetch("object/" + UMB_BUCKET + "/" + encodePath(path), {
    method: "POST",
    headers: { "Content-Type": prepared.type, "Cache-Control": "max-age=31536000" },
    body: prepared.blob,
  });
  if (!up.ok) {
    var msg = "Upload failed (" + up.status + ").";
    try { var j = await up.json(); if (j && j.message) msg += " " + j.message; } catch (_e) {}
    throw new Error(msg);
  }

  try {
    var rows = await sbInsert("umb_documents", {
      mumin_id: person.id, document_type_id: typeId, file_name: prepared.name, storage_path: path,
      mime_type: prepared.type, size_bytes: prepared.blob.size, notes: opts.notes || "",
      uploaded_by: opts.userEmail || "Unknown",
    });
    var row = Array.isArray(rows) ? rows[0] : rows;
    await logActivity("create", "umb_document", (person.name || "") + " — " + (opts.typeName || "document"), opts.userEmail);
    return row;
  } catch (e) {
    try { await storageFetch("object/" + UMB_BUCKET + "/" + encodePath(path), { method: "DELETE" }); } catch (_e2) {}
    throw e;
  }
}

// ── Delete: row first (so nothing visible points at a missing file), then the file ──
export async function deleteDocument(doc, person, typeName, userEmail) {
  await sbDelete("umb_documents", doc.id);
  try { await storageFetch("object/" + UMB_BUCKET + "/" + encodePath(doc.storage_path), { method: "DELETE" }); } catch (_e) {}
  await logActivity("delete", "umb_document", ((person && person.name) || "") + " — " + (typeName || "document"), userEmail);
}

// ── Signed URLs ──────────────────────────────────────────────────
export async function getDocumentUrl(doc, expiresIn) {
  var res = await storageFetch("object/sign/" + UMB_BUCKET + "/" + encodePath(doc.storage_path), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: expiresIn || 3600 }),
  });
  if (!res.ok) throw new Error("Could not open this document (" + res.status + ").");
  var data = await res.json();
  if (!data || !data.signedURL) throw new Error("Storage did not return a document link.");
  return data.signedURL.indexOf("http") === 0 ? data.signedURL : SUPABASE_URL + "/storage/v1" + data.signedURL;
}

export async function downloadDocument(doc) {
  var url = await getDocumentUrl(doc, 300);
  var res = await fetch(url);
  if (!res.ok) throw new Error("Download failed (" + res.status + ").");
  var blob = await res.blob();
  var a = document.createElement("a");
  var objectUrl = URL.createObjectURL(blob);
  a.href = objectUrl; a.download = doc.file_name || "document"; a.click();
  setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 5000);
}

// ── Completeness ─────────────────────────────────────────────────
// docs: all umb_documents rows. Returns { byMumin: { id: { typeId: count } }, ... }
export function indexDocuments(docs) {
  var byMumin = {};
  (docs || []).forEach(function (d) {
    var k = String(d.mumin_id);
    if (!byMumin[k]) byMumin[k] = {};
    byMumin[k][d.document_type_id] = (byMumin[k][d.document_type_id] || 0) + 1;
  });
  return byMumin;
}

export function missingTypes(person, index, requiredTypes) {
  var have = index[String(person.id)] || {};
  return requiredTypes.filter(function (t) { return !have[t.id]; });
}

export function fmtSize(bytes) {
  var b = Number(bytes) || 0;
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(0) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}
