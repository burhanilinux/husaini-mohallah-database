import { getMuminAge } from "./utils.js";

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function openA4(title, html, targetWindow) {
  var css = [
    "@page{size:A4;margin:12mm}",
    "*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}",
    "html,body{margin:0;padding:0;background:#fff;color:#161616;font-family:Arial,Helvetica,sans-serif;font-size:10.5pt}",
    ".sheet{width:100%;max-width:186mm;margin:0 auto}",
    ".head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-bottom:2px solid #b08a2e;padding-bottom:10px}",
    ".brand{font-size:18pt;font-weight:700;letter-spacing:.2px}.sub{font-size:8pt;color:#777;margin-top:2px;letter-spacing:1.2px;text-transform:uppercase}",
    ".date{text-align:right;font-size:8pt;color:#666;line-height:1.5}.date strong{color:#222;font-size:9pt}",
    ".hero{display:flex;gap:14px;align-items:center;padding:12px 0 10px;border-bottom:1px solid #ddd}",
    ".photo{width:20mm;height:24mm;flex:0 0 20mm;border:1px solid #d7d7d7;border-radius:5px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f4f0e7;color:#9b7625;font-size:18pt;font-weight:700}",
    ".photo img{width:100%;height:100%;object-fit:cover}",
    ".name{font-size:18pt;font-weight:700;margin-bottom:4px}.meta{font-size:9pt;color:#555}.badge{display:inline-block;border:1px solid #cfcfcf;border-radius:12px;padding:2px 8px;font-size:8pt;margin-left:5px}",
    ".section{margin-top:10px}.section-title{font-size:8pt;text-transform:uppercase;letter-spacing:1.5px;color:#8a681d;font-weight:700;border-bottom:1px solid #eadfbe;padding-bottom:4px;margin-bottom:6px}",
    ".grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px}.field{border:1px solid #e1e1e1;border-radius:4px;padding:6px 8px;min-height:35px}.field.full{grid-column:1/-1}.label{font-size:7pt;color:#777;text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px}.value{font-size:9.5pt;font-weight:600;word-break:break-word}",
    ".family{border:1px solid #e7dcc0;border-radius:5px;overflow:hidden}.family-head{display:grid;grid-template-columns:12mm 1fr 22mm 12mm 28mm;column-gap:3mm;background:#faf7ef;font-size:7pt;text-transform:uppercase;color:#777;padding:5px 7px}.member{display:grid;grid-template-columns:12mm 1fr 22mm 12mm 28mm;column-gap:3mm;align-items:center;padding:4px 7px;border-top:1px solid #eee;font-size:8.5pt}.family-head span:nth-child(3),.family-head span:nth-child(4),.member span:nth-child(3),.member span:nth-child(4){text-align:center;font-variant-numeric:tabular-nums}.member-photo{width:7mm;height:8mm;max-width:7mm;object-fit:cover;border:1px solid #ddd;border-radius:3px;background:#f4f0e7}.member-photo.empty{display:flex;align-items:center;justify-content:center;color:#9b7625;font-size:7pt;font-weight:700}.member.hof{font-weight:700}.role{color:#8a681d;font-size:7.5pt}",    ".quality{border:1px solid #e3c66d;background:#fffaf0;border-radius:5px;padding:7px 9px;font-size:8pt;color:#674e12;line-height:1.45}",
    ".footer{margin-top:12px;padding-top:6px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:7pt;color:#888}",
    ".no-print{display:none!important}",
    "@media screen{body{background:#eee;padding:18px}.sheet{background:#fff;padding:12mm;box-shadow:0 2px 12px rgba(0,0,0,.12)}}",
  ].join("");
  var doc = "<!doctype html><html><head><meta charset='utf-8'><title>" + esc(title) + "</title><style>" + css + "</style></head><body>" + html + "<script>window.onload=function(){var images=Array.prototype.slice.call(document.images);Promise.all(images.map(function(img){if(img.complete)return Promise.resolve();return new Promise(function(resolve){img.onload=resolve;img.onerror=resolve;});})).then(function(){setTimeout(function(){window.print();},250);});};</script></body></html>";
  var win = targetWindow || window.open("", "_blank");
  if (!win) { alert("Please allow popups for printing."); return; }
  if (targetWindow) {
    win.document.open(); win.document.write(doc); win.document.close();
  } else {
    var url = URL.createObjectURL(new Blob([doc], { type: "text/html;charset=utf-8" }));
    win.location.href = url;
    setTimeout(function () { URL.revokeObjectURL(url); }, 15000);
  }
}

export function printMuminA4(m, familyRecord, familyMembers, sectorInfo, photoUrl, targetWindow) {
  var today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  var age = getMuminAge(m);
  var initial = esc((m.name || "?").trim().charAt(0).toUpperCase());
  var photo = (photoUrl || m.photo_url) ? "<img src=\'" + esc(photoUrl || m.photo_url) + "\' alt=\'\'>" : initial;
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
    h += "<div class='family' style='margin-top:6px'><div class='family-head'><span>Photo</span><span>Family Member</span><span>ITS</span><span>Age</span><span>Role</span></div>";
    familyMembers.forEach(function (member) {
      var isHof = familyRecord && familyRecord.hof_its_id && (String(member.its_id) === String(familyRecord.hof_its_id) || String(member.its_number) === String(familyRecord.hof_its_id));
      var memberAge = getMuminAge(member);
      var memberPhotoUrl = member.photo_url || member.photoUrl || member.profile_photo_url || "";
      var memberInitial = esc((member.name || "?").trim().charAt(0).toUpperCase());
      var memberPhoto = memberPhotoUrl
        ? "<img class='member-photo' src='" + esc(memberPhotoUrl) + "' alt=''>"
        : "<span class='member-photo empty'>" + memberInitial + "</span>";
      h += "<div class='member" + (isHof ? " hof" : "") + "'>" + memberPhoto + "<span>" + (isHof ? "★ " : "") + esc(member.name || "—") + "</span><span>" + esc(member.its_number || "—") + "</span><span>" + esc(memberAge == null ? "—" : memberAge) + "</span><span class='role'>" + (isHof ? "Head of Family" : "Family Member") + "</span></div>";
    });
    h += "</div>";
  }
  h += "</div>";

  if (warnings.length) {
    h += "<div class='section'><div class='section-title'>Data Quality</div><div class='quality'>" + warnings.map(esc).join(" &nbsp;•&nbsp; ") + "</div></div>";
  }
  h += "<div class='footer'><span>Husaini Mohallah Database</span><span>Confidential community record</span><span>Printed: " + esc(new Date().toLocaleString()) + "</span></div></div>";
  openA4("Mumin Profile - " + (m.name || ""), h, targetWindow);
}

// ── Full Profile print (all 77 Jamaat-export fields) ──────────────
// Reads from source_data first (the raw synced row, always complete),
// falling back to the app's own mumin_data columns for records that
// were added manually rather than via Excel sync.
var FULL_PROFILE_SECTIONS = [
  {
    title: "Identity & Family Links",
    fields: [
      ["ITS_ID", "ITS Number"], ["HOF_FM_TYPE", "HOF / Family Member"], ["HOF_ID", "HOF ITS"],
      ["Family_ID", "Family ID"], ["Father_ITS_ID", "Father ITS"], ["Mother_ITS_ID", "Mother ITS"],
      ["Spouse_ITS_ID", "Spouse ITS"], ["TanzeemFile_No", "Tanzeem File No."],
    ],
  },
  {
    title: "Name Details",
    fields: [
      ["Full_Name", "Full Name"], ["Full_Name_Arabic", "Full Name (Arabic)"], ["First_Prefix", "First Prefix"],
      ["Prefix_Year", "Prefix Year"], ["First_Name", "First Name"], ["Father_Prefix", "Father's Prefix"],
      ["Father_Name", "Father's Name"], ["Father_Surname", "Father's Surname"], ["Husband_Prefix", "Husband's Prefix"],
      ["Husband_Name", "Husband's Name"], ["Surname", "Surname"],
    ],
  },
  {
    title: "Personal Details",
    fields: [
      ["Age", "Age"], ["Hijri_Age", "Hijri Age"], ["Gender", "Gender"], ["Misaq", "Misaq"],
      ["Marital_Status", "Marital Status"], ["Blood_Group", "Blood Group"], ["Warakatul_Tarkhis", "Warakatul Tarkhis"],
      ["Date_Of_Nikah", "Date of Nikah"], ["Date_Of_Nikah_Hijri", "Date of Nikah (Hijri)"],
    ],
  },
  {
    title: "Contact",
    fields: [["Mobile", "Mobile"], ["Email", "Email"], ["WhatsApp_No", "WhatsApp No."]],
  },
  {
    title: "Community & Organisations",
    fields: [
      ["Title", "Title"], ["Category", "Category"], ["Idara", "Idara"],
      ["Organisation", "Organisation"], ["Organisation_CSV", "All Organisations"],
    ],
  },
  {
    title: "Origin",
    fields: [["Vatan", "Vatan"], ["Nationality", "Nationality"], ["Jamaat", "Jamaat"], ["Jamiaat", "Jamiaat"]],
  },
  {
    title: "Education & Occupation",
    fields: [
      ["Qualification", "Qualification"], ["Languages", "Languages"], ["Hunars", "Hunars"],
      ["Occupation", "Occupation"], ["Sub_Occupation", "Sub-Occupation"], ["Sub_Occupation2", "Sub-Occupation 2"],
    ],
  },
  {
    title: "Religious Record",
    fields: [
      ["Quran_Sanad", "Quran Sanad"], ["Qadambosi_Sharaf", "Qadambosi Sharaf"],
      ["Raudat_Tahera_Ziyarat", "Raudat Tahera Ziyarat"], ["Karbala_Ziyarat", "Karbala Ziyarat"],
      ["Ashara_Mubaraka", "Ashara Mubaraka (times)"],
    ],
  },
  {
    title: "Housing & Address",
    fields: [
      ["Housing", "Housing"], ["Type_of_House", "Type of House"], ["Address", "Address"],
      ["Building", "Building"], ["Street", "Street"], ["Area", "Area"],
      ["State", "State"], ["City", "City"], ["Pincode", "Pincode"],
    ],
  },
  {
    title: "Sector Assignment",
    fields: [["Sector", "Sector"], ["Sub_Sector", "Sub-Sector"]],
  },
  {
    title: "Status & Verification",
    fields: [
      ["Inactive_Status", "Inactive Status"], ["Data_Verifcation_Status", "Data Verification Status"],
      ["Data_Verification_Date", "Data Verification Date"], ["Photo_Verifcation_Status", "Photo Verification Status"],
      ["Photo_Verification_Date", "Photo Verification Date"], ["Last_Scanned_Event", "Last Scanned Event"],
      ["Last_Scanned_Place", "Last Scanned Place"],
    ],
  },
  {
    title: "Sector & Sub-Sector Incharge (per source export)",
    fields: [
      ["Sector_Incharge_ITSID", "Sector Incharge ITS"], ["Sector_Incharge_Name", "Sector Incharge Name"],
      ["Sector_Incharge_Female_ITSID", "Sector Incharge (Female) ITS"], ["Sector_Incharge_Female_Name", "Sector Incharge (Female) Name"],
      ["Sub_Sector_Incharge_ITSID", "Sub-Sector Incharge ITS"], ["Sub_Sector_Incharge_Name", "Sub-Sector Incharge Name"],
      ["Sub_Sector_Incharge_Female_ITSID", "Sub-Sector Incharge (Female) ITS"], ["Sub_Sector_Incharge_Female_Name", "Sub-Sector Incharge (Female) Name"],
    ],
  },
];

// Fallback used only when a record has no source_data (i.e. it was added
// manually through the app form rather than synced from an Excel upload).
function manualFallbackValue(m, sourceKey) {
  var map = {
    Full_Name: m.name, Mobile: m.phone, Email: m.email, Gender: m.gender,
    Age: m.age, Address: m.address, Sector: m.area_sector, ITS_ID: m.its_number,
    Family_ID: m.family_id, Inactive_Status: m.status === "Inactive" ? "Inactive" : "",
  };
  return Object.prototype.hasOwnProperty.call(map, sourceKey) ? map[sourceKey] : "";
}

export function printMuminFullProfile(m, familyRecord, familyMembers, sectorInfo, targetWindow) {
  var today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  var src = m.source_data || {};
  var hasSource = !!m.source_data;

     // Fields with a dedicated mumin_data column always win over source_data,
  // since a manual edit after sync updates the column but not the frozen
  // export snapshot. source_data is the fallback for the ~50 fields that
  // have no dedicated column (Arabic name, prefixes, nikah dates, incharge
  // names, etc.) and for records with no dedicated columns at all.
  var liveMap = {
    ITS_ID: m.its_number, Full_Name: m.name, Age: m.age, Gender: m.gender,
    Mobile: m.phone, Email: m.email, Address: m.address, Sector: m.area_sector,
    Family_ID: m.family_id, Inactive_Status: m.status || "",
    Occupation: m.occupation, Sub_Occupation: m.sub_occupation, Qualification: m.qualification,
    Languages: m.languages, Hunars: m.hunars, Marital_Status: m.marital_status, Blood_Group: m.blood_group,
    Misaq: m.misaq, City: m.city, Vatan: m.vatan, Nationality: m.nationality, WhatsApp_No: m.whatsapp_no,
    Housing: m.housing, Type_of_House: m.type_of_house, Data_Verifcation_Status: m.data_verification_status,
    Photo_Verifcation_Status: m.photo_verification_status, Quran_Sanad: m.quran_sanad,
    Qadambosi_Sharaf: m.qadambosi_sharaf, Raudat_Tahera_Ziyarat: m.raudat_tahera_ziyarat,
    Karbala_Ziyarat: m.karbala_ziyarat, Ashara_Mubaraka: m.ashara_mubaraka, Warakatul_Tarkhis: m.warakatul_tarkhis,
    Last_Scanned_Event: m.last_scanned_event, Last_Scanned_Place: m.last_scanned_place,
  };

  function val(sourceKey) {
    var live = liveMap[sourceKey];
    if (live !== undefined && live !== null && live !== "") return esc(live);
    var raw = hasSource ? src[sourceKey] : manualFallbackValue(m, sourceKey);
    return raw === null || raw === undefined || raw === "" ? "—" : esc(raw);
  }
  

  var css = [
    "@page{size:A4;margin:12mm}",
    "*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}",
    "html,body{margin:0;padding:0;background:#fff;color:#161616;font-family:Arial,Helvetica,sans-serif;font-size:9.5pt}",
    ".sheet{width:100%;max-width:186mm;margin:0 auto}",
    ".head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-bottom:2px solid #b08a2e;padding-bottom:10px}",
    ".brand{font-size:16pt;font-weight:700}.sub{font-size:8pt;color:#777;margin-top:2px;letter-spacing:1.2px;text-transform:uppercase}",
    ".date{text-align:right;font-size:8pt;color:#666;line-height:1.5}.date strong{color:#222;font-size:9pt}",
    ".hero{display:flex;gap:12px;align-items:center;padding:10px 0 8px;border-bottom:1px solid #ddd}",
    ".photo{width:20mm;height:24mm;flex:0 0 20mm;border:1px solid #d7d7d7;border-radius:5px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f4f0e7;color:#9b7625;font-size:18pt;font-weight:700}",
    ".photo img{width:100%;height:100%;object-fit:cover}",
    ".name{font-size:15pt;font-weight:700;margin-bottom:3px}.meta{font-size:8.5pt;color:#555}",
    ".section{margin-top:8px;break-inside:avoid}.section-title{font-size:7.5pt;text-transform:uppercase;letter-spacing:1.3px;color:#8a681d;font-weight:700;border-bottom:1px solid #eadfbe;padding-bottom:3px;margin-bottom:5px}",
    ".grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px 8px}",
    ".field{border:1px solid #e6e6e6;border-radius:4px;padding:4px 7px}",
    ".field.full{grid-column:1/-1}",
    ".label{font-size:6.5pt;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:1px}",
    ".value{font-size:8.5pt;font-weight:600;word-break:break-word;line-height:1.3}",
    ".family{border:1px solid #e7dcc0;border-radius:5px;overflow:hidden;margin-top:6px}",
    ".family-head{display:grid;grid-template-columns:12mm 1fr 26mm 27mm;background:#faf7ef;font-size:7pt;text-transform:uppercase;color:#777;padding:4px 7px}",
    ".member{display:grid;grid-template-columns:12mm 1fr 26mm 27mm;align-items:center;padding:4px 7px;border-top:1px solid #eee;font-size:8pt}.member-photo{width:9mm;height:10mm;object-fit:cover;border:1px solid #ddd;border-radius:3px;background:#f4f0e7}.member-photo.empty{display:flex;align-items:center;justify-content:center;color:#9b7625;font-size:8pt;font-weight:700}",
    ".member.hof{font-weight:700}",
    ".footer{margin-top:10px;padding-top:6px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:7pt;color:#888}",
    ".no-source{border:1px solid #e3c66d;background:#fffaf0;border-radius:5px;padding:7px 9px;font-size:8pt;color:#674e12;margin-bottom:8px}",
    "@media screen{body{background:#eee;padding:18px}.sheet{background:#fff;padding:10mm;box-shadow:0 2px 12px rgba(0,0,0,.12)}}",
  ].join("");

  var h = "<div class='sheet'>";
  h += "<div class='head'><div><div class='brand'>Husaini Mohallah</div><div class='sub'>Full Mumin Profile</div></div><div class='date'><strong>All Fields</strong><br>Printed " + esc(today) + "</div></div>";

  var initial = esc((m.name || "?").trim().charAt(0).toUpperCase());
  var photo = m.photo_url ? "<img src='" + esc(m.photo_url) + "' alt=''>" : initial;
  h += "<div class='hero'><div class='photo'>" + photo + "</div><div><div class='name'>" + esc(m.name || "Unnamed Mumin") + "</div><div class='meta'>ITS: <strong>" + esc(m.its_number || "—") + "</strong>" + (m.status ? " · " + esc(m.status) : "") + "</div></div></div>";

  if (!hasSource) {
    h += "<div class='no-source'>⚠ This record has no synced Excel data (source_data) — it was likely added or edited manually. Only the core fields below are available; the remaining sections will show \"—\".</div>";
  }

  FULL_PROFILE_SECTIONS.forEach(function (section) {
    h += "<div class='section'><div class='section-title'>" + esc(section.title) + "</div><div class='grid'>";
    section.fields.forEach(function (pair) {
      h += "<div class='field'><div class='label'>" + esc(pair[1]) + "</div><div class='value'>" + val(pair[0]) + "</div></div>";
    });
    h += "</div></div>";
  });

  // App-resolved sector/masool/musaid (these come from your sectors/sub_sectors
  // tables, not the raw source row, so they can differ from the plain-text
  // Sector/Sub_Sector fields above if leadership has changed since last sync).
  if (sectorInfo && (sectorInfo.masoolName || sectorInfo.musaidName)) {
    h += "<div class='section'><div class='section-title'>Current App-Resolved Leadership</div><div class='grid'>";
    h += "<div class='field'><div class='label'>Masool</div><div class='value'>" + esc(sectorInfo.masoolName || "—") + "</div></div>";
    h += "<div class='field'><div class='label'>Musaid</div><div class='value'>" + esc(sectorInfo.musaidName || "—") + "</div></div>";
    h += "</div></div>";
  }

  h += "<div class='section'><div class='section-title'>Family & Head of Family</div><div class='grid'>";
  h += "<div class='field'><div class='label'>Family ID</div><div class='value'>" + esc(m.family_id || "—") + "</div></div>";
  h += "<div class='field'><div class='label'>Sabil No.</div><div class='value'>" + esc((familyRecord && familyRecord.sabil_no) || m.sabil_no || "—") + "</div></div>";
  h += "<div class='field'><div class='label'>HOF ITS</div><div class='value'>" + esc((familyRecord && familyRecord.hof_its_id) || "—") + "</div></div>";
  h += "</div>";
  if (familyMembers && familyMembers.length) {
    h += "<div class='family'><div class='family-head'><span>Photo</span><span>Family Member</span><span>ITS</span><span>Role</span></div>";
    familyMembers.forEach(function (member) {
      var isHof = familyRecord && familyRecord.hof_its_id && (String(member.its_id) === String(familyRecord.hof_its_id) || String(member.its_number) === String(familyRecord.hof_its_id));
      var memberPhotoUrl = member.photo_url || member.photoUrl || member.profile_photo_url || "";
      var memberInitial = esc((member.name || "?").trim().charAt(0).toUpperCase());
      var memberPhoto = memberPhotoUrl
        ? "<img class='member-photo' src='" + esc(memberPhotoUrl) + "' alt=''>"
        : "<span class='member-photo empty'>" + memberInitial + "</span>";
      h += "<div class='member" + (isHof ? " hof" : "") + "'>" + memberPhoto + "<span>" + (isHof ? "★ " : "") + esc(member.name || "—") + "</span><span>" + esc(member.its_number || "—") + "</span><span>" + (isHof ? "Head of Family" : "Family Member") + "</span></div>";
    });
    h += "</div>";
  }
  h += "</div>";

  h += "<div class='footer'><span>Husaini Mohallah Database</span><span>Confidential — full community record</span><span>Printed: " + esc(new Date().toLocaleString()) + "</span></div></div>";

  var doc = "<!doctype html><html><head><meta charset='utf-8'><title>" + esc("Full Profile - " + (m.name || "")) + "</title><style>" + css + "</style></head><body>" + h + "<script>window.onload=function(){setTimeout(function(){window.print()},120)};</script></body></html>";
  var win = targetWindow || window.open("", "_blank");
  if (!win) { alert("Please allow popups for printing."); return; }
  if (targetWindow) {
    win.document.open(); win.document.write(doc); win.document.close();
  } else {
    var url = URL.createObjectURL(new Blob([doc], { type: "text/html;charset=utf-8" }));
    win.location.href = url;
    setTimeout(function () { URL.revokeObjectURL(url); }, 15000);
  }
}
