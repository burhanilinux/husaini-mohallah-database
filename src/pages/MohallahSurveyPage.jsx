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
        if (m.action === "set" && typeof m.value === "string") localStorage.setItem(m.key, m.value);
        else if (m.action === "remove") localStorage.removeItem(m.key);
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
      if (active) setHtml(isolateSurveyHtml(source, savedSurveyValues()));
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
