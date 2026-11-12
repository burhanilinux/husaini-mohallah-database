import { UMOOR_PREFIX } from "./constants.js";

// ── Umoor helpers ─────────────────────────────────────────────────
export function getUmoorPrefix(umoorType) {
  return UMOOR_PREFIX[umoorType] || "GEN";
}

// ── Age / DOB helpers ─────────────────────────────────────────────
export function calcAge(dob) {
  if (!dob) return null;
  var d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  var today = new Date();
  var age = today.getFullYear() - d.getFullYear();
  var m   = today.getMonth()    - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

export function getMuminAge(m) {
  if (!m) return null;
  var fromDob = calcAge(m.dob);
  return fromDob !== null ? fromDob : (m.age === 0 || m.age ? Number(m.age) : null);
}

// ── Family member ordering ────────────────────────────────────────
// Oldest first; members with no known age go last; ties fall back to ITS.
export function compareMuminByAge(a, b) {
  var ageA = getMuminAge(a), ageB = getMuminAge(b);
  var hasA = ageA !== null && ageA !== undefined && !isNaN(ageA);
  var hasB = ageB !== null && ageB !== undefined && !isNaN(ageB);
  if (hasA && hasB && ageA !== ageB) return ageB - ageA;
  if (hasA !== hasB) return hasA ? -1 : 1;
  return String(a.its_id || a.its_number || "").localeCompare(String(b.its_id || b.its_number || ""));
}

// HOF always first, then everyone else by age. Pass the family's HOF ITS if
// known; otherwise the HOF is detected from source_data.HOF_FM_TYPE.
export function sortFamilyMembers(members, hofIts) {
  var hof = hofIts === null || hofIts === undefined ? "" : String(hofIts).trim();
  function isHead(m) {
    if (hof) return String(m.its_id) === hof || String(m.its_number) === hof;
    return String((m.source_data && m.source_data.HOF_FM_TYPE) || "").toUpperCase() === "HOF";
  }
  return (members || []).slice().sort(function (a, b) {
    var ha = isHead(a), hb = isHead(b);
    if (ha !== hb) return ha ? -1 : 1;
    return compareMuminByAge(a, b);
  });
}

// ── File helpers ──────────────────────────────────────────────────
export function fileToBase64(file) {
  return new Promise(function (res, rej) {
    var r = new FileReader();
    r.onload = function () { res(r.result); };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function fmtBytes(b) {
  if (b < 1024)    return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1)    + " KB";
  return               (b / 1048576).toFixed(1) + " MB";
}

// ── Export helpers ────────────────────────────────────────────────
export function downloadBlob(content, filename, mime) {
  var blob = new Blob([content], { type: mime });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function xmlEsc(v) {
  return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function toXLS(rows, cols, sheetName) {
  var xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
  xml += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
  xml += '<Worksheet ss:Name="' + xmlEsc((sheetName || "Sheet1").slice(0, 31)) + '"><Table>';
  xml += "<Row>";
  cols.forEach(function (c) { xml += "<Cell><Data ss:Type=\"String\">" + xmlEsc(c) + "</Data></Cell>"; });
  xml += "</Row>";
  rows.forEach(function (r) {
    xml += "<Row>";
    cols.forEach(function (c) {
      var v = r[c] == null ? "" : String(r[c]);
      var t = (v === "" || v.trim() === "" || /^0\d/.test(v) || !/^-?\d+(\.\d+)?$/.test(v.trim())) ? "String" : "Number";
      v = xmlEsc(v);
      xml += "<Cell><Data ss:Type=\"" + t + "\">" + v + "</Data></Cell>";
    });
    xml += "</Row>";
  });
  xml += "</Table></Worksheet></Workbook>";
  downloadBlob(xml, (sheetName || "export") + ".xls", "application/vnd.ms-excel");
}

export function toCSV(rows, cols) {
  const escape = (v) => {
    const s = String(v == null ? "" : v).split('"').join('""');
    return (s.indexOf(",") >= 0 || s.indexOf("\n") >= 0 || s.indexOf('"') >= 0)
      ? '"' + s + '"' : s;
  };
  return [cols.join(",")]
    .concat(rows.map(r => cols.map(c => escape(r[c])).join(",")))
    .join("\n");
}

export function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(function (h) {
    var t = h.trim();
    if (t.charAt(0) === '"')           t = t.slice(1);
    if (t.charAt(t.length - 1) === '"') t = t.slice(0, -1);
    return t;
  });
  return lines.slice(1).map(function (line) {
    var vals = [], cur = "", inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"')              inQ = !inQ;
      else if (ch === "," && !inQ) { vals.push(cur); cur = ""; }
      else                           cur += ch;
    }
    vals.push(cur);
    var obj = {};
    headers.forEach(function (h, idx) { obj[h] = (vals[idx] || "").trim(); });
    return obj;
  });
}
