import { getMuminAge } from "./utils.js";

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openA4(title, html) {
  var css = [
    "@page{size:A4;margin:12mm}",
    "*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}",
    "html,body{margin:0;padding:0;background:#fff;color:#161616;font-family:Arial,Helvetica,sans-serif;font-size:10.5pt}",
    ".sheet{width:100%;max-width:186mm;margin:0 auto}",
    ".head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-bottom:2px solid #b08a2e;padding-bottom:10px}",
    ".brand{font-size:18pt;font-weight:700;letter-spacing:.2px}.sub{font-size:8pt;color:#777;margin-top:2px;letter-spacing:1.2px;text-transform:uppercase}",
    ".date{text-align:right;font-size:8pt;color:#666;line-height:1.5}.date strong{color:#222;font-size:9pt}",
    ".hero{display:flex;gap:14px;align-items:center;padding:12px 0 10px;border-bottom:1px solid #ddd}",
    ".photo{width:25mm;height:30mm;flex:0 0 25mm;border:1px solid #d7d7d7;border-radius:5px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f4f0e7;color:#9b7625;font-size:22pt;font-weight:700}",
    ".photo img{width:100%;height:100%;object-fit:cover}",
    ".name{font-size:18pt;font-weight:700;margin-bottom:4px}.meta{font-size:9pt;color:#555}.badge{display:inline-block;border:1px solid #cfcfcf;border-radius:12px;padding:2px 8px;font-size:8pt;margin-left:5px}",
    ".section{margin-top:10px}.section-title{font-size:8pt;text-transform:uppercase;letter-spacing:1.5px;color:#8a681d;font-weight:700;border-bottom:1px solid #eadfbe;padding-bottom:4px;margin-bottom:6px}",
    ".grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px}.field{border:1px solid #e1e1e1;border-radius:4px;padding:6px 8px;min-height:35px}.field.full{grid-column:1/-1}.label{font-size:7pt;color:#777;text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px}.value{font-size:9.5pt;font-weight:600;word-break:break-word}",
    ".family{border:1px solid #e7dcc0;border-radius:5px;overflow:hidden}.family-head{display:grid;grid-template-columns:1fr 26mm 27mm;background:#faf7ef;font-size:7pt;text-transform:uppercase;color:#777;padding:5px 7px}.member{display:grid;grid-template-columns:1fr 26mm 27mm;padding:5px 7px;border-top:1px solid #eee;font-size:8.5pt}.member.hof{font-weight:700}.role{color:#8a681d;font-size:7.5pt}",
    ".quality{border:1px solid #e3c66d;background:#fffaf0;border-radius:5px;padding:7px 9px;font-size:8pt;color:#674e12;line-height:1.45}",
    ".footer{margin-top:12px;padding-top:6px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:7pt;color:#888}",
    ".no-print{display:none!important}",
    "@media screen{body{background:#eee;padding:18px}.sheet{background:#fff;padding:12mm;box-shadow:0 2px 12px rgba(0,0,0,.12)}}",
  ].join("");
  var doc = "<!doctype html><html><head><meta charset='utf-8'><title>" + esc(title) + "</title><style>" + css + "</style></head><body>" + html + "<script>window.onload=function(){setTimeout(function(){window.print()},120)};</script></body></html>";
  var url = URL.createObjectURL(new Blob([doc], { type: "text/html;charset=utf-8" }));
  var win = window.open(url, "_blank");
  if (!win) { alert("Please allow popups for printing."); return; }
  setTimeout(function () { URL.revokeObjectURL(url); }, 15000);
}

export function printMuminA4(m, familyRecord, familyMembers, sectorInfo) {
  var today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  var age = getMuminAge(m);
  var initial = esc((m.name || "?").trim().charAt(0).toUpperCase());
  var photo = m.photo_url ? "<img src='" + esc(m.photo_url) + "' alt=''>" : initial;
  var warnings = [];
  if (!m.its_number) warnings.push("Missing ITS number");
  if (!m.phone) warnings.push("Missing phone number");
  if (!m.dob && !m.age) warnings.push("Missing DOB / age");
  if (!m.area_sector) warnings.push("Area Sector not assigned");
  if (!familyRecord) warnings.push("Family record not assigned");
  if (familyRecord && !familyRecord.hof_its_id) warnings.push("Family has no HOF assigned");

  var h = "<div class='sheet'>";
  h += "<div class='head'><div><div class='brand'>Husaini Mohallah</div><div class='sub'>Mumineen Community Database</div></div><div class='date'><strong>Mumin Profile</strong><br>Printed " + esc(today) + "</div></div>";
  h += "<div class='hero'><div class='photo'>" + photo + "</div><div><div class='name'>" + esc(m.name || "Unnamed Mumin") + "</div><div class='meta'>ITS: <strong>" + esc(m.its_number || "—") + "</strong>" + (m.status ? "<span class='badge'>" + esc(m.status) + "</span>" : "") + "</div></div></div>";

  h += "<div class='section'><div class='section-title'>Personal & Contact Details</div><div class='grid'>";
  h += "<div class='field'><div class='label'>Age / Date of Birth</div><div class='value'>" + esc(age == null ? "—" : age) + (m.dob ? " • " + esc(m.dob) : "") + "</div></div>";
  h += "<div class='field'><div class='label'>Gender</div><div class='value'>" + esc(m.gender || "—") + "</div></div>";
  h += "<div class='field'><div class='label'>Phone</div><div class='value'>" + esc(m.phone || "—") + "</div></div>";
  h += "<div class='field'><div class='label'>Email</div><div class='value'>" + esc(m.email || "—") + "</div></div>";
  h += "<div class='field full'><div class='label'>Address</div><div class='value'>" + esc(m.address || "—") + "</div></div></div></div>";

  h += "<div class='section'><div class='section-title'>Community Assignment</div><div class='grid'>";
  h += "<div class='field'><div class='label'>Area Sector</div><div class='value'>" + esc(sectorInfo && sectorInfo.sectorName || m.area_sector || "—") + "</div></div>";
  h += "<div class='field'><div class='label'>Sabil No.</div><div class='value'>" + esc((familyRecord && familyRecord.sabil_no) || m.sabil_no || "—") + "</div></div>";
  h += "<div class='field'><div class='label'>Masool</div><div class='value'>" + esc(sectorInfo && sectorInfo.masoolName || "—") + "</div></div>";
  h += "<div class='field'><div class='label'>Sub-Sector</div><div class='value'>" + esc(sectorInfo && sectorInfo.subSectorName || "—") + "</div></div>";
  h += "<div class='field'><div class='label'>Musaid</div><div class='value'>" + esc(sectorInfo && sectorInfo.musaidName || "—") + "</div></div></div></div>";

  h += "<div class='section'><div class='section-title'>Family & Head of Family</div><div class='grid'>";
  h += "<div class='field'><div class='label'>Family ID</div><div class='value'>" + esc(m.family_id || "—") + "</div></div>";
  h += "<div class='field'><div class='label'>Head of Family ITS</div><div class='value'>" + esc(familyRecord && familyRecord.hof_its_id || "—") + "</div></div></div>";
  if (familyMembers && familyMembers.length) {
    h += "<div class='family' style='margin-top:6px'><div class='family-head'><span>Family Member</span><span>ITS</span><span>Role</span></div>";
    familyMembers.forEach(function (member) {
      var isHof = familyRecord && familyRecord.hof_its_id && (String(member.its_id) === String(familyRecord.hof_its_id) || String(member.its_number) === String(familyRecord.hof_its_id));
      h += "<div class='member" + (isHof ? " hof" : "") + "'><span>" + (isHof ? "★ " : "") + esc(member.name || "—") + "</span><span>" + esc(member.its_number || "—") + "</span><span class='role'>" + (isHof ? "Head of Family" : "Family Member") + "</span></div>";
    });
    h += "</div>";
  }
  h += "</div>";

  if (warnings.length) {
    h += "<div class='section'><div class='section-title'>Data Quality</div><div class='quality'>" + warnings.map(esc).join(" &nbsp;•&nbsp; ") + "</div></div>";
  }
  h += "<div class='footer'><span>Husaini Mohallah Database</span><span>Confidential community record</span><span>Printed: " + esc(new Date().toLocaleString()) + "</span></div></div>";
  openA4("Mumin Profile - " + (m.name || ""), h);
}
