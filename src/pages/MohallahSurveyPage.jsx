import { useEffect, useRef, useState } from "react";
import { SUPABASE_URL, SUPABASE_ANON, getToken, getSession } from "../lib/supabase.js";

var BUCKET = "survey-legacy";
var STORAGE_KEY_RE = /^hm-survey(?:[12]|-unified)?-/;

function authHeaders() {
  var session = getSession();
  if (!session || !session.access_token) throw new Error("Please sign in again to open legacy surveys.");
  return { apikey: SUPABASE_ANON, Authorization: "Bearer " + getToken() };
}
function listSheets() {
  var h = authHeaders();
  h["Content-Type"] = "application/json";
  return fetch(SUPABASE_URL + "/storage/v1/object/list/" + BUCKET, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ prefix: "", limit: 100, sortBy: { column: "name", order: "asc" } })
  }).then(function (r) {
    if (!r.ok) throw new Error("Could not list survey sheets (" + r.status + "). Check the private bucket and access policy.");
    return r.json();
  }).then(function (rows) {
    return rows.filter(function (x) { return x && typeof x.name === "string" && /^[-a-z0-9_ ]+\.html$/i.test(x.name); });
  });
}
function loadSheet(name) {
  return fetch(SUPABASE_URL + "/storage/v1/object/authenticated/" + BUCKET + "/" + encodeURIComponent(name), {
    headers: authHeaders()
  }).then(function (r) {
    if (!r.ok) throw new Error("Could not open " + name + " (" + r.status + ").");
    return r.text();
  });
}
function label(name) {
  return name.replace(/\.html$/i, "").replace(/[-_]+/g, " ");
}
function savedSurveyValues() {
  var values = {};
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && STORAGE_KEY_RE.test(key)) values[key] = localStorage.getItem(key);
    }
  } catch (_e) {}
  return values;
}

// Recover legacy house-visit status from the shared database. The isolated iframe
// intentionally cannot read the app session, so the parent fetches this data.
function loadCloudVisitValues(values) {
  var headers = authHeaders();
  headers.Accept = "application/json";
  return fetch(SUPABASE_URL + "/rest/v1/mohallah_survey_families?select=hof_its,hof_name,sector,priority,category,mobile,family_count,status,address,city,children,source_record,visited,visit_date,visit_remarks&order=priority.asc,hof_name.asc", {
    headers: headers
  }).then(function (r) {
    if (!r.ok) throw new Error("Could not restore saved survey records (" + r.status + ").");
    return r.json();
  }).then(function (rows) {
    var families = rows.map(function (r) {
      return Object.assign({}, r.source_record || {}, { i: r.hof_its, n: r.hof_name || "", s: r.sector || "", p: r.priority || "", cat: r.category || "", m: r.mobile || "", k: String(r.family_count == null ? "" : r.family_count), st: r.status || "", a: r.address || "", ct: r.city || "", c: Array.isArray(r.children) ? r.children : [] });
    });
    values["hm-survey-unified-families-v1"] = JSON.stringify(families);
    try { localStorage.setItem("hm-survey-unified-families-v1", values["hm-survey-unified-families-v1"]); } catch (_e) {}
    var visits = {};
    try {
      var local = JSON.parse(values["hm-survey-unified-visits-v1"] || "{}");
      if (local && typeof local === "object" && !Array.isArray(local)) visits = local;
    } catch (_e) {}
    rows.forEach(function (r) {
      var id = String(r.hof_its == null ? "" : r.hof_its);
      if (id && (r.visited || r.visit_date || r.visit_remarks)) {
        visits[id] = { v: !!r.visited, d: r.visit_date || "", r: r.visit_remarks || "" };
      }
    });
    values["hm-survey-unified-visits-v1"] = JSON.stringify(visits);
    try { localStorage.setItem("hm-survey-unified-visits-v1", values["hm-survey-unified-visits-v1"]); } catch (_e) {}
    return values;
  });
}

function syncCloudVisitChanges(previousValue, nextValue) {
  var previous = {};
  var next = {};
  try { previous = JSON.parse(previousValue || "{}") || {}; } catch (_e) {}
  try { next = JSON.parse(nextValue || "{}") || {}; } catch (_e) {}
  var ids = {};
  var baseHeaders;
  try { baseHeaders = authHeaders(); } catch (e) {
    console.warn("House-visit change is saved locally; sign in again to sync it.", e);
    return;
  }
  Object.keys(previous).forEach(function (id) { ids[id] = true; });
  Object.keys(next).forEach(function (id) { ids[id] = true; });
  Object.keys(ids).forEach(function (id) {
    if (JSON.stringify(previous[id] || null) === JSON.stringify(next[id] || null)) return;
    var v = next[id] || {};
    fetch(SUPABASE_URL + "/rest/v1/mohallah_survey_families?hof_its=eq." + encodeURIComponent(id), {
      method: "PATCH",
      headers: Object.assign({}, baseHeaders, { "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({ visited: !!v.v, visit_date: v.d || null, visit_remarks: v.r || null })
    }).then(function (r) {
      if (!r.ok) console.warn("Could not sync house-visit change for", id, r.status);
    }).catch(function (e) { console.warn("Could not sync house-visit change", e); });
  });
}
// The iframe has no same-origin permission. This small bridge preserves only
// survey-specific localStorage keys; the embedded document never gets app/session storage.
function isolateSurveyHtml(html, initialValues) {
  var serialized = JSON.stringify(initialValues).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  var shim = "<script>(function(){var d=" + serialized + ";var ok=function(k){return typeof k==='string'&&/^hm-survey(?:[12]|-unified)?-/.test(k)};var s={getItem:function(k){k=String(k);return ok(k)&&Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){k=String(k);if(!ok(k))return;d[k]=String(v);parent.postMessage({type:'HM_SURVEY_STORAGE',action:'set',key:k,value:d[k]},'*')},removeItem:function(k){k=String(k);if(!ok(k))return;delete d[k];parent.postMessage({type:'HM_SURVEY_STORAGE',action:'remove',key:k},'*')},clear:function(){Object.keys(d).forEach(function(k){if(ok(k)){delete d[k];parent.postMessage({type:'HM_SURVEY_STORAGE',action:'remove',key:k},'*')}})},key:function(i){var a=Object.keys(d).filter(ok);return a[i]===undefined?null:a[i]}};Object.defineProperty(s,'length',{get:function(){return Object.keys(d).filter(ok).length}});try{Object.defineProperty(window,'localStorage',{configurable:true,value:s})}catch(e){}})();</" + "script>";
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, function (head) { return head + shim; }) : shim + html;
}

export function MohallahSurveyPage() {
  var [sheets, setSheets] = useState([]);
  var [current, setCurrent] = useState("");
  var [html, setHtml] = useState("");
  var [err, setErr] = useState("");
  var [busy, setBusy] = useState(false);
  var frameRef = useRef(null);

  useEffect(function () {
    var active = true;
    listSheets().then(function (rows) {
      if (!active) return;
      setSheets(rows);
      if (rows.length) setCurrent(rows[0].name);
      else setErr("No survey sheets uploaded yet. Upload the approved .html files to Supabase Storage → survey-legacy.");
    }).catch(function (e) { if (active) setErr(e.message || "Unable to load survey list."); });
    function onMessage(event) {
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;
      var m = event.data;
      if (!m || m.type !== "HM_SURVEY_STORAGE" || !STORAGE_KEY_RE.test(String(m.key || ""))) return;
      try {
        if (m.action === "set" && typeof m.value === "string") {
          if (m.key === "hm-survey-unified-visits-v1") {
            syncCloudVisitChanges(localStorage.getItem(m.key), m.value);
          }
          localStorage.setItem(m.key, m.value);
        } else if (m.action === "remove") localStorage.removeItem(m.key);
      } catch (_e) {}
    }
    window.addEventListener("message", onMessage);
    return function () { active = false; window.removeEventListener("message", onMessage); };
  }, []);

  useEffect(function () {
    if (!current) { setHtml(""); return; }
    var active = true;
    setBusy(true); setErr(""); setHtml("");
    loadSheet(current).then(function (source) {
      if (!active) return;
      // The legacy unified HTML expects a parent config, but the sandboxed iframe cannot access it.
      // Supply only public project config plus a placeholder token; authenticated visit reads/writes stay in the parent.
      var compatibleSource = current === "husaini-mohallah-unified-survey.html"
        ? source
            .replace("const SB=(window.parent&&window.parent.__HM_SURVEY_CONFIG)||{};", "const SB={url:" + JSON.stringify(SUPABASE_URL) + ",key:" + JSON.stringify(SUPABASE_ANON) + ",token:'parent-bridge'};")
            .replace("applyX();sortD();$('q').oninput=view;", "try{var restoredFamilies=JSON.parse(localStorage.getItem(\'hm-survey-unified-families-v1\')||\'[]\');if(Array.isArray(restoredFamilies)&&restoredFamilies.length){D.splice(0,D.length,...restoredFamilies);}}catch(e){}applyX();sortD();$(\'q\').oninput=view;")
        : source;
      var values = savedSurveyValues();
      var prepare = current === "husaini-mohallah-unified-survey.html"
        ? loadCloudVisitValues(values).catch(function (e) {
            console.warn("Could not restore cloud house visits; using local copy", e);
            return values;
          })
        : Promise.resolve(values);
      prepare.then(function (initialValues) {
        if (active) setHtml(isolateSurveyHtml(compatibleSource, initialValues));
      });
    }).catch(function (e) { if (active) setErr(e.message || "Unable to open survey."); })
      .finally(function () { if (active) setBusy(false); });
    return function () { active = false; };
  }, [current]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)", minHeight: 480, gap: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <strong>Mohallah-Survey (Legacy)</strong>
        <select aria-label="Choose legacy survey" value={current} onChange={function (e) { setCurrent(e.target.value); }}
          style={{ padding: "7px 10px", borderRadius: 6, maxWidth: "100%" }}>
          {sheets.map(function (s) { return <option key={s.name} value={s.name}>{label(s.name)}</option>; })}
        </select>
        {busy ? <span role="status">Loading survey…</span> : null}
      </div>
      {err ? <div role="alert" style={{ padding: 10, color: "#b3261e", background: "#fff1f0", borderRadius: 6 }}>{err}</div> : null}
      {html ? <iframe ref={frameRef} title="Mohallah Survey Legacy" srcDoc={html}
        sandbox="allow-scripts allow-modals allow-downloads"
        referrerPolicy="no-referrer"
        style={{ flex: 1, minHeight: 0, width: "100%", border: "1px solid #ddd", borderRadius: 8, background: "#fff" }} /> : null}
    </div>
  );
}
