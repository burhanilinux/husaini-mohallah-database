import { getPhotoUrl } from "./storage.js";

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

var CSS = [
  "@page{size:A4;margin:12mm}",
  "*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}",
  "html,body{margin:0;padding:0;background:#fff;color:#161616;font-family:Arial,Helvetica,sans-serif;font-size:10pt}",
  ".sector{page-break-after:always;margin-bottom:20px}.sector:last-of-type{page-break-after:auto}",
  ".head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #b08a2e;padding-bottom:8px;margin-bottom:10px}",
  ".brand{font-size:17pt;font-weight:700}.sub{font-size:8pt;color:#777;letter-spacing:1.2px;text-transform:uppercase;margin-top:2px}",
  ".date{text-align:right;font-size:8pt;color:#666;line-height:1.5}",
  ".sec-name{font-size:16pt;font-weight:700;margin:4px 0 2px}.sec-meta{font-size:9pt;color:#555;margin-bottom:10px}",
  ".lead{display:flex;gap:18px;border:1px solid #e7dcc0;background:#faf7ef;border-radius:5px;padding:7px 10px;margin:8px 0 6px;font-size:9pt;align-items:baseline}",
  ".lead .role{font-size:7.5pt;text-transform:uppercase;letter-spacing:1.2px;color:#8a681d;font-weight:700}",
  ".lead .nm{font-weight:700;font-size:10.5pt}",
  ".blk-title{font-size:8pt;text-transform:uppercase;letter-spacing:1.5px;color:#8a681d;font-weight:700;border-bottom:1px solid #eadfbe;padding-bottom:3px;margin:12px 0 4px}",
  "table{width:100%;border-collapse:collapse}",
  "thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}",
  "th{background:#eee;font-size:7.5pt;text-transform:uppercase;letter-spacing:.8px;color:#555;text-align:left;padding:4px 6px;border:1px solid #bbb}",
  "td{padding:3px 6px;border:1px solid #ccc;font-size:9pt;vertical-align:middle}",
  "td.n{width:8mm;text-align:right;color:#777}td.p{width:16mm;text-align:center}",
  ".ph{width:11mm;height:13mm;object-fit:cover;border:1px solid #ccc;border-radius:3px;display:block;margin:0 auto}",
  ".ph.e{display:flex;align-items:center;justify-content:center;background:#f4f0e7;color:#9b7625;font-weight:700;font-size:11pt}",
  ".empty{font-size:9pt;color:#888;padding:6px 2px}",
  ".footer{margin-top:10px;padding-top:5px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:7pt;color:#888}",
  "@media screen{body{background:#eee;padding:18px}.sector{background:#fff;padding:12mm;margin:0 auto 16px;max-width:210mm;box-shadow:0 2px 12px rgba(0,0,0,.12)}}"
].join("");

function hofTable(hofs, photoMap) {
  if (!hofs.length) return "<div class='empty'>No HOF records found.</div>";
  var h = "<table><thead><tr><th>#</th><th>Photo</th><th>HOF Name</th><th>ITS No.</th><th>Phone</th></tr></thead><tbody>";
  hofs.forEach(function (m, i) {
    var url = m.photo_url ? photoMap[m.photo_url] : null;
    var initial = esc((m.name || "?").trim().charAt(0).toUpperCase());
    var photo = url ? "<img class='ph' src='" + esc(url) + "' alt=''>" : "<div class='ph e'>" + initial + "</div>";
    h += "<tr><td class='n'>" + (i + 1) + "</td><td class='p'>" + photo + "</td><td><strong>" + esc(m.name || "—") + "</strong></td><td>" + esc(m.its || "—") + "</td><td>" + esc(m.phone || "—") + "</td></tr>";
  });
  return h + "</tbody></table>";
}

// sectors: [{ name, masoolName, masoolPhone, hofs:[{name,its,phone,photo_url}],
//             subs:[{ name, musaidName, musaidPhone, hofs:[...] }], unassignedHofs:[...] }]
// Must be called directly from a click handler (opens the window synchronously).
export function printMasoolHofDirectory(sectors, title) {
  var win = window.open("", "_blank");
  if (!win) { alert("Please allow popups for printing."); return; }
  win.document.open();
  win.document.write("<p style='font-family:Arial;padding:20px'>Preparing report with photos…</p>");
  win.document.close();

  var all = [];
  sectors.forEach(function (s) {
    all = all.concat(s.hofs || [], s.unassignedHofs || []);
    (s.subs || []).forEach(function (sub) { all = all.concat(sub.hofs || []); });
  });
  var urls = {};
  all.forEach(function (m) { if (m.photo_url) urls[m.photo_url] = true; });
  var keys = Object.keys(urls);

  Promise.all(keys.map(function (k) { return getPhotoUrl(k).catch(function () { return null; }); }))
    .then(function (resolved) {
      var photoMap = {};
      keys.forEach(function (k, i) { photoMap[k] = resolved[i]; });
      var today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
      var body = "";
      sectors.forEach(function (s) {
        body += "<div class='sector'>";
        body += "<div class='head'><div><div class='brand'>Husaini Mohallah</div><div class='sub'>HOF Directory by Masool &amp; Musaid</div></div><div class='date'><strong>" + esc(title || "Sector Report") + "</strong><br>Printed " + esc(today) + "</div></div>";
        body += "<div class='sec-name'>" + esc(s.name) + "</div>";
        body += "<div class='sec-meta'>" + (s.hofs || []).length + " HOF" + ((s.hofs || []).length === 1 ? "" : "s") + " · " + (s.subs || []).length + " sub-sector" + ((s.subs || []).length === 1 ? "" : "s") + "</div>";
        body += "<div class='lead'><span class='role'>Masool</span><span class='nm'>" + esc(s.masoolName || "Not assigned") + "</span><span>" + esc(s.masoolPhone || "") + "</span></div>";
        if ((s.unassignedHofs || []).length) {
          body += "<div class='blk-title'>HOFs directly under Masool (no sub-sector)</div>" + hofTable(s.unassignedHofs, photoMap);
        }        (s.subs || []).forEach(function (sub) {
          body += "<div class='lead' style='margin-top:16px'><span class='role'>Musaid</span><span class='nm'>" + esc(sub.musaidName || "Not assigned") + "</span><span>" + esc(sub.musaidPhone || "") + "</span><span style='margin-left:auto;color:#555'>Sub-Sector: <strong>" + esc(sub.name) + "</strong></span></div>";
          body += hofTable(sub.hofs || [], photoMap);
        });
        if ((s.unassignedHofs || []).length) {
          body += "<div class='blk-title' style='margin-top:16px'>HOFs not assigned to a sub-sector</div>" + hofTable(s.unassignedHofs, photoMap);
        }
        body += "<div class='footer'><span>Husaini Mohallah Database</span><span>Confidential community record</span><span>Printed: " + esc(new Date().toLocaleString()) + "</span></div></div>";
      });
      var doc = "<!doctype html><html><head><meta charset='utf-8'><title>" + esc(title || "Sector HOF Directory") + "</title><style>" + CSS + "</style></head><body>" + body +
        "<script>window.onload=function(){var imgs=Array.prototype.slice.call(document.images);Promise.all(imgs.map(function(i){if(i.complete)return Promise.resolve();return new Promise(function(r){i.onload=r;i.onerror=r;});})).then(function(){setTimeout(function(){window.print();},250);});};<\/script></body></html>";
      win.document.open(); win.document.write(doc); win.document.close();
    })
    .catch(function () {
      try { win.close(); } catch (_e) {}
      alert("Unable to prepare photos for printing. Please try again.");
    });
}
