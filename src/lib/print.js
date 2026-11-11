import { getMuminAge } from "./utils.js";

// ── Shared print stylesheet (used by every print popup) ───────────
var PRINT_CSS = [
  "*{-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}",
  "body{margin:40px;font-family:'Roboto',sans-serif;background:#fff;color:#111}",
  ".print-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #c9a84c;padding-bottom:16px;margin-bottom:20px}",
  ".print-logo{font-size:20px;font-weight:700;color:#8a6a1a}",
  ".print-logo-sub{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#888;margin-top:3px}",
  ".print-date{font-size:11px;color:#888;text-align:right;line-height:1.6}",
  ".print-type{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#8a6a1a;margin-bottom:6px}",
  ".print-title{font-size:22px;font-weight:700;color:#111;margin-bottom:6px}",
  ".print-subtitle{font-size:12px;color:#666;margin-bottom:20px}",
  ".print-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}",
  ".print-field{border:1px solid #e5e5e5;border-radius:6px;padding:8px 12px}",
  ".print-field.full{grid-column:span 2}",
  ".print-field-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:3px}",
  ".print-field-val{font-size:13px;color:#111;font-weight:500}",
  ".print-section-title{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#8a6a1a;margin:18px 0 8px;font-weight:700;border-bottom:1px solid #f0e6cc;padding-bottom:4px}",
  ".print-desc{border:1px solid #e5e5e5;border-radius:6px;padding:12px 16px;font-size:13px;color:#333;line-height:1.7;margin-bottom:16px}",
  ".print-family-box{border:1px solid #f0e6cc;border-radius:8px;padding:12px 16px;background:#fffdf7;margin-bottom:16px}",
  ".print-family-name{font-size:14px;font-weight:600;color:#8a6a1a}",
  ".print-family-role{font-size:11px;color:#666;margin-left:8px}",
  ".print-att-list{display:flex;flex-direction:column;gap:6px}",
  ".print-att-item{font-size:12px;color:#333;background:#fafafa;border:1px solid #eee;border-radius:6px;padding:6px 12px}",
  ".print-due{border:1px solid #fde68a;border-radius:6px;padding:10px 16px;font-size:13px;color:#92400e;background:#fffbeb;margin-bottom:16px}",
  ".print-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid}",
  ".print-badge-active{color:#15803d;border-color:#86efac;background:#f0fdf4}",
  ".print-badge-closed{color:#6b7280;border-color:#d1d5db;background:#f9fafb}",
  ".print-badge-pending{color:#92400e;border-color:#fde68a;background:#fffbeb}",
  ".print-footer{margin-top:36px;padding-top:12px;border-top:1px solid #e5e5e5;font-size:10px;color:#aaa;display:flex;justify-content:space-between}",
  ".idcard-page{display:flex;align-items:center;justify-content:center;min-height:90vh;background:#f3f3f3}",
  ".idcard{width:300px;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.25);font-family:'Roboto',sans-serif;position:relative;background:#15110a}",
  ".idcard-top{position:relative;height:170px;background:linear-gradient(135deg,#1a1410 0%,#2a1f10 35%,#8a6a1a 70%,#c9a84c 100%);overflow:hidden}",
  ".idcard-diag1{position:absolute;width:220px;height:220px;background:rgba(0,0,0,.28);transform:rotate(45deg);top:-90px;left:-70px}",
  ".idcard-diag2{position:absolute;width:180px;height:180px;background:rgba(0,0,0,.22);transform:rotate(45deg);top:30px;right:-90px}",
  ".idcard-brand{position:relative;z-index:2;text-align:center;padding-top:14px}",
  ".idcard-brand-name{font-size:11px;font-weight:700;letter-spacing:2px;color:#fff;text-transform:uppercase}",
  ".idcard-brand-sub{font-size:8px;letter-spacing:2px;color:#e8d9b0;text-transform:uppercase;margin-top:2px}",
  ".idcard-photo-wrap{position:absolute;left:50%;top:78px;transform:translateX(-50%);width:104px;height:104px;border-radius:14px;background:#fff;border:3px solid rgba(255,255,255,.9);box-shadow:0 6px 16px rgba(0,0,0,.3);overflow:hidden;z-index:3;display:flex;align-items:center;justify-content:center}",
  ".idcard-photo-wrap img{width:100%;height:100%;object-fit:cover}",
  ".idcard-photo-initial{font-size:40px;font-weight:700;color:#8a6a1a;background:#f0e6cc;width:100%;height:100%;display:flex;align-items:center;justify-content:center}",
  ".idcard-body{background:#15110a;padding-top:62px;padding-bottom:18px;text-align:center}",
  ".idcard-name{font-size:17px;font-weight:800;letter-spacing:.5px;color:#fff;text-transform:uppercase;margin-bottom:3px}",
  ".idcard-role{font-size:10px;font-weight:600;letter-spacing:2px;color:#c9a84c;text-transform:uppercase;margin-bottom:16px}",
  ".idcard-info{padding:0 26px;text-align:left}",
  ".idcard-info-row{display:flex;font-size:10px;color:#d8cdb0;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.06)}",
  ".idcard-info-label{width:62px;color:#9a8a5f;flex-shrink:0}",
  ".idcard-info-colon{width:10px;flex-shrink:0;color:#9a8a5f}",
  ".idcard-info-val{color:#fff;font-weight:500;word-break:break-word}",
  ".idcard-barcode-wrap{padding:16px 26px 20px;text-align:center}",
  ".idcard-barcode{display:inline-flex;align-items:flex-end;gap:1px;height:34px}",
  ".idcard-barcode-id{font-size:8px;color:#9a8a5f;letter-spacing:2px;margin-top:6px}"
].join("");

function esc(value) {
  return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\'/g, "&#039;");
}

// ── Popup opener (Blob URL — avoids the document.write CSS-as-text bug) ──
function openPrint(title, bodyHtml) {
  var fullHtml = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>" + esc(title) +
    "</title><style>" + PRINT_CSS + "</style></head><body>" + bodyHtml +
    "<scr" + "ipt>window.onload=function(){window.print();}<" + "/scr" + "ipt></body></html>";
  var blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  var url  = URL.createObjectURL(blob);
  var w    = window.open(url, "_blank");
  if (!w) { alert("Please allow popups for this site to enable printing."); return; }
  setTimeout(function () { URL.revokeObjectURL(url); }, 15000);
}

// ── Individual Mumin record ────────────────────────────────────────
export function printMumin(m, sabilFamily, sectorInfo) {
  var sc = (m.status || "active").toLowerCase();
  var today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  var h = "";
  h += "<div class='print-header'>";
  h += "<div><div class='print-logo'>Husaini Mohallah</div><div class='print-logo-sub'>Husaini Mohallah &bull; Database</div></div>";
  h += "<div class='print-date'><strong>Mumin Record</strong><br/>" + today + "</div>";
  h += "</div>";
  h += "<div class='print-title'>" + esc(m.name || "") + "</div>";
  h += "<div class='print-subtitle'>ITS: " + esc(m.its_number || "") + " &nbsp;&nbsp; <span class='print-badge print-badge-" + esc(sc) + "'>" + esc(m.status || "") + "</span></div>";
  h += "<div class='print-section-title'>Personal Details</div>";
  h += "<div class='print-grid'>";
  h += "<div class='print-field'><div class='print-field-label'>Age</div><div class='print-field-val'>" + esc(getMuminAge(m) || "\u2014") + "</div></div>";
  h += "<div class='print-field'><div class='print-field-label'>Gender</div><div class='print-field-val'>" + esc(m.gender || "\u2014") + "</div></div>";
  h += "<div class='print-field'><div class='print-field-label'>Phone</div><div class='print-field-val'>" + esc(m.phone || "\u2014") + "</div></div>";
  h += "<div class='print-field'><div class='print-field-label'>Email</div><div class='print-field-val'>" + esc(m.email || "\u2014") + "</div></div>";
  h += "<div class='print-field full'><div class='print-field-label'>Address</div><div class='print-field-val'>" + esc(m.address || "\u2014") + "</div></div>";
  h += "<div class='print-field full'><div class='print-field-label'>Area Sector</div><div class='print-field-val'>" + esc(m.area_sector || "\u2014") + "</div></div>";
  h += "<div class='print-field full'><div class='print-field-label'>Sabil No.</div><div class='print-field-val'>" + esc(m.sabil_no || "\u2014") + "</div></div>";
  h += "</div>";
  if (sectorInfo && (sectorInfo.sectorName || sectorInfo.subSectorName)) {
    h += "<div class='print-section-title'>Sector &amp; Leadership</div>";
    h += "<div class='print-grid'>";
    h += "<div class='print-field'><div class='print-field-label'>Sector</div><div class='print-field-val'>" + esc(sectorInfo.sectorName || "\u2014") + "</div></div>";
    h += "<div class='print-field'><div class='print-field-label'>Masool</div><div class='print-field-val'>" + esc(sectorInfo.masoolName || "\u2014") + "</div></div>";
    if (sectorInfo.subSectorName) {
      h += "<div class='print-field'><div class='print-field-label'>Sub-Sector</div><div class='print-field-val'>" + esc(sectorInfo.subSectorName) + "</div></div>";
      h += "<div class='print-field'><div class='print-field-label'>Musaid</div><div class='print-field-val'>" + esc(sectorInfo.musaidName || "\u2014") + "</div></div>";
    }
    h += "</div>";
  }
  if (m.sabil_no && sabilFamily && sabilFamily.length > 0) {
    h += "<div class='print-section-title'>Family \u2014 Sabil No. " + esc(m.sabil_no) + "</div>";
    h += "<div class='print-family-box'>";
    sabilFamily.forEach(function (o) {
      h += "<div class='print-family-name' style='margin-bottom:4px'>" + esc(o.name) + " <span class='print-family-role'>(" + esc(o.its_number || "") + ")</span></div>";
    });
    h += "</div>";
  }
  h += "<div class='print-footer'><span>Husaini Mohallah Database</span><span>Printed: " + new Date().toLocaleString() + "</span></div>";
  openPrint("Mumin - " + (m.name || ""), h);
}

// ── Deterministic pseudo-barcode (visual only, derived from ITS no.) ──
function makeBarcode(value) {
  var str = String(value || "0000000");
  var bars = "";
  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    var w1 = (code % 3) + 1;
    var h1 = 18 + (code % 16);
    bars += "<div style='width:" + w1 + "px;height:" + h1 + "px;background:#fff;margin-right:1px'></div>";
    var w2 = ((code >> 2) % 2) + 1;
    var h2 = 22 + ((code >> 1) % 12);
    bars += "<div style='width:" + w2 + "px;height:" + h2 + "px;background:#fff;margin-right:1px'></div>";
  }
  return bars;
}

// ── ID Card ───────────────────────────────────────────────────────
export function printIdCard(m, sabilFamily, sectorInfo) {
  var initial = esc((m.name || "?").trim().charAt(0).toUpperCase());
  var photoHtml = m.photo_url
    ? "<img src='" + esc(m.photo_url) + "' alt='' />"
    : "<div class='idcard-photo-initial'>" + initial + "</div>";
  var h = "";
  h += "<div class='idcard-page'>";
  h += "<div class='idcard'>";
  h += "<div class='idcard-top'>";
  h += "<div class='idcard-diag1'></div>";
  h += "<div class='idcard-diag2'></div>";
  h += "<div class='idcard-brand'>";
  h += "<div class='idcard-brand-name'>Husaini Mohallah</div>";
  h += "<div class='idcard-brand-sub'>Mumin Identity Card</div>";
  h += "</div>";
  h += "<div class='idcard-photo-wrap'>" + photoHtml + "</div>";
  h += "</div>";
  h += "<div class='idcard-body'>";
  h += "<div class='idcard-name'>" + esc(m.name || "") + "</div>";
  h += "<div class='idcard-role'>" + esc(m.status || "Mumin") + "</div>";
  h += "<div class='idcard-info'>";
  h += "<div class='idcard-info-row'><span class='idcard-info-label'>ITS No.</span><span class='idcard-info-colon'>:</span><span class='idcard-info-val'>" + esc(m.its_number || "\u2014") + "</span></div>";
  h += "<div class='idcard-info-row'><span class='idcard-info-label'>Phone</span><span class='idcard-info-colon'>:</span><span class='idcard-info-val'>" + esc(m.phone || "\u2014") + "</span></div>";
  if (m.email) h += "<div class='idcard-info-row'><span class='idcard-info-label'>E-mail</span><span class='idcard-info-colon'>:</span><span class='idcard-info-val'>" + esc(m.email) + "</span></div>";
  h += "<div class='idcard-info-row'><span class='idcard-info-label'>Age/Sex</span><span class='idcard-info-colon'>:</span><span class='idcard-info-val'>" + esc(getMuminAge(m) || "\u2014") + " / " + esc(m.gender || "\u2014") + "</span></div>";
  if (m.area_sector) h += "<div class='idcard-info-row'><span class='idcard-info-label'>Sector</span><span class='idcard-info-colon'>:</span><span class='idcard-info-val'>" + esc(m.area_sector) + "</span></div>";
  if (m.sabil_no) h += "<div class='idcard-info-row'><span class='idcard-info-label'>Sabil No.</span><span class='idcard-info-colon'>:</span><span class='idcard-info-val'>" + esc(m.sabil_no) + "</span></div>";
  if (sectorInfo && sectorInfo.masoolName) h += "<div class='idcard-info-row'><span class='idcard-info-label'>Masool</span><span class='idcard-info-colon'>:</span><span class='idcard-info-val'>" + esc(sectorInfo.masoolName) + "</span></div>";
  if (sectorInfo && sectorInfo.subSectorName) h += "<div class='idcard-info-row'><span class='idcard-info-label'>Sub-Sector</span><span class='idcard-info-colon'>:</span><span class='idcard-info-val'>" + esc(sectorInfo.subSectorName) + "</span></div>";
  if (sectorInfo && sectorInfo.musaidName) h += "<div class='idcard-info-row'><span class='idcard-info-label'>Musaid</span><span class='idcard-info-colon'>:</span><span class='idcard-info-val'>" + esc(sectorInfo.musaidName) + "</span></div>";
  h += "</div>";
  h += "<div class='idcard-barcode-wrap'>";
  h += "<div class='idcard-barcode'>" + makeBarcode(m.its_number) + "</div>";
  h += "<div class='idcard-barcode-id'>" + esc(m.its_number || "") + "</div>";
  h += "</div>";
  h += "</div>";
  h += "</div>";
  h += "</div>";
  openPrint("ID Card - " + (m.name || ""), h);
}

// ── Umoor File record ─────────────────────────────────────────────
export function printFile(f, atts) {
  var sc = (f.status || "active").toLowerCase();
  var today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  var h = "";
  h += "<div class='print-header'>";
  h += "<div><div class='print-logo'>Husaini Mohallah</div><div class='print-logo-sub'>Husaini Mohallah &bull; Database</div></div>";
  h += "<div class='print-date'><strong>Umoor File</strong><br/>" + today + "</div>";
  h += "</div>";
  h += "<div class='print-type'>" + esc(f.umoor_type || "") + "</div>";
  h += "<div class='print-title'>" + esc(f.title || "") + "</div>";
  h += "<div class='print-subtitle'><span class='print-badge print-badge-" + esc(sc) + "'>" + esc(f.status || "") + "</span></div>";
  h += "<div class='print-section-title'>File Details</div>";
  h += "<div class='print-grid'>";
  h += "<div class='print-field'><div class='print-field-label'>File No.</div><div class='print-field-val' style='font-family:monospace;color:#8a6a1a'>" + esc(f.file_no || "\u2014") + "</div></div>";
  h += "<div class='print-field'><div class='print-field-label'>Year</div><div class='print-field-val'>" + esc(f.year || "\u2014") + "</div></div>";
  h += "<div class='print-field'><div class='print-field-label'>Date</div><div class='print-field-val'>" + esc(f.date || "\u2014") + "</div></div>";
  h += "<div class='print-field'><div class='print-field-label'>Status</div><div class='print-field-val'>" + esc(f.status || "\u2014") + "</div></div>";
  h += "</div>";
  if (f.description) {
    h += "<div class='print-section-title'>Description</div>";
    h += "<div class='print-desc'>" + esc(f.description) + "</div>";
  }
  if (f.due_date) {
    h += "<div class='print-section-title'>Due Date</div>";
    h += "<div class='print-due'>Due: " + esc(f.due_date) + "</div>";
  }
  if (atts && atts.length > 0) {
    h += "<div class='print-section-title'>Attachments (" + atts.length + ")</div>";
    h += "<div class='print-att-list'>";
    atts.forEach(function (att) {
      var icon = att.type && att.type.startsWith("image/") ? "[IMG]" : att.type === "application/pdf" ? "[PDF]" : "[FILE]";
      h += "<div class='print-att-item'>" + icon + " " + esc(att.name) + "</div>";
    });
    h += "</div>";
  }
  h += "<div class='print-footer'><span>Husaini Mohallah Database</span><span>Printed: " + new Date().toLocaleString() + "</span></div>";
  openPrint("File - " + (f.title || ""), h);
}
// ── Sector details (Masool / Musaid) ──────────────────────────────
// sectors: [{ name, masoolName, masoolPhone, memberCount, subs: [{ name, musaidName, musaidPhone, memberCount }] }]
export function printSectorDetails(sectors, title) {
  var today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  var extra = "<style>table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ddd;padding:7px 10px;text-align:left;font-size:12px}th{background:#faf7ef;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#777}.sector-block{page-break-after:always;margin-bottom:30px}.sector-block:last-of-type{page-break-after:auto}</style>";
  var h = extra;
  sectors.forEach(function (s) {
    h += "<div class='sector-block'>";
    h += "<div class='print-header'><div><div class='print-logo'>Husaini Mohallah</div><div class='print-logo-sub'>Sector Details</div></div><div class='print-date'><strong>" + esc(title || "Sector Report") + "</strong><br/>" + today + "</div></div>";
    h += "<div class='print-title'>" + esc(s.name) + "</div>";
    h += "<div class='print-subtitle'>" + s.memberCount + " member" + (s.memberCount !== 1 ? "s" : "") + " · " + s.subs.length + " sub-sector" + (s.subs.length !== 1 ? "s" : "") + "</div>";
    h += "<div class='print-section-title'>Masool</div><div class='print-grid'>";
    h += "<div class='print-field'><div class='print-field-label'>Masool</div><div class='print-field-val'>" + esc(s.masoolName || "Not assigned") + "</div></div>";
    h += "<div class='print-field'><div class='print-field-label'>Phone</div><div class='print-field-val'>" + esc(s.masoolPhone || "\u2014") + "</div></div></div>";
    h += "<div class='print-section-title'>Sub-Sectors & Musaid</div>";
    if (!s.subs.length) {
      h += "<div class='print-desc'>No sub-sectors under this sector.</div>";
    } else {
      h += "<table><thead><tr><th>Sub-Sector</th><th>Musaid</th><th>Phone</th><th>Members</th></tr></thead><tbody>";
      s.subs.forEach(function (sub) {
        h += "<tr><td>" + esc(sub.name) + "</td><td>" + esc(sub.musaidName || "Not assigned") + "</td><td>" + esc(sub.musaidPhone || "\u2014") + "</td><td>" + sub.memberCount + "</td></tr>";
      });
      h += "</tbody></table>";
    }
    h += "<div class='print-footer'><span>Husaini Mohallah Database</span><span>Printed: " + new Date().toLocaleString() + "</span></div></div>";
  });
  openPrint(title || "Sector Details", h);
}
