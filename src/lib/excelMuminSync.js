import * as XLSX from "xlsx";
import { sbGet, sbInsert, sbUpsert, sbUpdateWhere } from "./supabase.js";

export const SOURCE_COLUMNS = [
  "ITS_ID", "HOF_FM_TYPE", "HOF_ID", "Family_ID", "Father_ITS_ID", "Mother_ITS_ID", "Spouse_ITS_ID",
  "TanzeemFile_No", "Full_Name", "Full_Name_Arabic", "First_Prefix", "Prefix_Year", "First_Name",
  "Father_Prefix", "Father_Name", "Father_Surname", "Husband_Prefix", "Husband_Name", "Surname", "Age",
  "Hijri_Age", "Gender", "Misaq", "Marital_Status", "Blood_Group", "Warakatul_Tarkhis", "Date_Of_Nikah",
  "Date_Of_Nikah_Hijri", "Mobile", "Email", "WhatsApp_No", "Title", "Category", "Idara", "Organisation",
  "Organisation_CSV", "Vatan", "Nationality", "Jamaat", "Jamiaat", "Qualification", "Languages", "Hunars",
  "Occupation", "Sub_Occupation", "Sub_Occupation2", "Quran_Sanad", "Qadambosi_Sharaf", "Raudat_Tahera_Ziyarat",
  "Karbala_Ziyarat", "Ashara_Mubaraka", "Housing", "Type_of_House", "Address", "Building", "Street", "Area",
  "State", "City", "Pincode", "Sector", "Sub_Sector", "Inactive_Status", "Data_Verifcation_Status",
  "Data_Verification_Date", "Photo_Verifcation_Status", "Photo_Verification_Date", "Last_Scanned_Event",
  "Last_Scanned_Place", "Sector_Incharge_ITSID", "Sector_Incharge_Name", "Sector_Incharge_Female_ITSID",
  "Sector_Incharge_Female_Name", "Sub_Sector_Incharge_ITSID", "Sub_Sector_Incharge_Name",
  "Sub_Sector_Incharge_Female_ITSID", "Sub_Sector_Incharge_Female_Name",
];

function text(v) { if (v === null || v === undefined) return ""; return String(v).trim(); }
function intOrNull(v) { var n = Number(text(v)); return Number.isFinite(n) && n !== 0 ? Math.trunc(n) : null; }
function cleanRow(row) { var out = {}; Object.keys(row || {}).forEach(function (k) { out[k] = row[k] === undefined || row[k] === null ? "" : row[k]; }); return out; }

export async function parseMuminExcel(file) {
  var buffer = await file.arrayBuffer();
  var wb = XLSX.read(buffer, { type: "array", cellDates: true, raw: false });
  if (!wb.SheetNames.length) throw new Error("The workbook contains no worksheets.");
  var sheet = wb.Sheets[wb.SheetNames[0]];
  var rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false, blankrows: false });
  if (!rows.length) throw new Error("The first worksheet contains no data rows.");
  return rows.map(cleanRow);
}

function organisationEntries(rows) {
  var map = {};
  rows.forEach(function (r) {
    var values = [];
    if (text(r.Organisation)) values.push(text(r.Organisation));
    if (text(r.Organisation_CSV)) values = values.concat(text(r.Organisation_CSV).split(","));
    values.forEach(function (raw) {
      var value = text(raw); if (!value) return;
      var bits = value.split(/\s+-\s+/); var name = text(bits[0]); if (!name) return;
      var role = bits.length > 1 ? text(bits.slice(1).join(" - ")) : null;
      map[name] = map[name] || { name: name, roleByIts: {} };
      var its = intOrNull(r.ITS_ID); if (its) map[name].roleByIts[its] = role || null;
    });
  });
  return Object.keys(map).sort().map(function (k) { return map[k]; });
}

function incharge(row, prefix) {
  return { its: intOrNull(row[prefix + "_ITSID"]), name: text(row[prefix + "_Name"]) };
}

function buildPayload(row, subSectorIdByKey) {
  var its = intOrNull(row.ITS_ID), sector = text(row.Sector), sub = text(row.Sub_Sector), subKey = sector + "\u0000" + sub;
  return {
    its_id: its, its_number: its === null ? "" : String(its), name: text(row.Full_Name), dob: null,
    age: intOrNull(row.Age), gender: text(row.Gender) || "Male", phone: text(row.Mobile), email: text(row.Email),
    address: text(row.Address), area_sector: sector, sub_sector_id: subSectorIdByKey[subKey] || null,
    sabil_no: null, status: text(row.Inactive_Status) ? "Inactive" : "Active", family_id: intOrNull(row.Family_ID),
    spouse_its_id: intOrNull(row.Spouse_ITS_ID), source_data: row,
    // Extended fields — written to the dedicated columns added by the
    // schema-extension migration, so they're directly queryable via SQL
    // and PostgREST instead of trapped inside source_data JSON.
    occupation: text(row.Occupation) || null,
    sub_occupation: text(row.Sub_Occupation) || null,
    qualification: text(row.Qualification) || null,
    languages: text(row.Languages) || null,
    hunars: text(row.Hunars) || null,
    marital_status: text(row.Marital_Status) || null,
    blood_group: text(row.Blood_Group) || null,
    misaq: text(row.Misaq) || null,
    city: text(row.City) || null,
    vatan: text(row.Vatan) || null,
    nationality: text(row.Nationality) || null,
    whatsapp_no: text(row.WhatsApp_No) || null,
    housing: text(row.Housing) || null,
    type_of_house: text(row.Type_of_House) || null,
    data_verification_status: text(row.Data_Verifcation_Status) || null,
    photo_verification_status: text(row.Photo_Verifcation_Status) || null,
    quran_sanad: text(row.Quran_Sanad) || null,
    qadambosi_sharaf: text(row.Qadambosi_Sharaf) || null,
    raudat_tahera_ziyarat: text(row.Raudat_Tahera_Ziyarat) || null,
    karbala_ziyarat: text(row.Karbala_Ziyarat) || null,
    ashara_mubaraka: text(row.Ashara_Mubaraka) || null,
    warakatul_tarkhis: text(row.Warakatul_Tarkhis) || null,
    last_scanned_event: text(row.Last_Scanned_Event) || null,
    last_scanned_place: text(row.Last_Scanned_Place) || null,
  };
}

async function chunksUpsert(table, rows, conflict, chunkSize) {
  var count = 0;
  for (var i = 0; i < rows.length; i += chunkSize) {
    var chunk = rows.slice(i, i + chunkSize); if (!chunk.length) continue;
    await sbUpsert(table, chunk, conflict); count += chunk.length;
  }
  return count;
}

// ── Import history log ────────────────────────────────────────────
// Non-fatal by design: a logging failure should never surface as a sync
// failure to the person who just successfully synced their data.
export async function logImportRun(meta, counts) {
  try {
    var total = counts
      ? (counts.new || 0) + (counts.updated || 0) + (counts.unchanged || 0) + (counts.conflicts || 0) + (counts.invalid || 0)
      : null;
    await sbInsert("import_log", {
      file_name: (meta && meta.fileName) || null,
      imported_by: (meta && meta.importedBy) || null,
      total_rows: total,
      new_count: counts ? counts.new : null,
      updated_count: counts ? counts.updated : null,
      unchanged_count: counts ? counts.unchanged : null,
      conflict_count: counts ? counts.conflicts : null,
      invalid_count: counts ? counts.invalid : null,
    });
  } catch (_e) {
    // Swallow — import history is a convenience, not a correctness guarantee.
  }
}

export async function getRecentImports(limit) {
  try {
    return await sbGet("import_log", "order=imported_at.desc&limit=" + (limit || 5));
  } catch (_e) {
    return [];
  }
}

// meta: { fileName, importedBy, analysisCounts } — analysisCounts is the
// `counts` object already computed by analyzeMuminExcel() in the caller,
// reused here purely for the history log (no need to recompute it).
export async function syncMuminExcel(rows, meta, progress) {
  var source = rows.map(cleanRow).filter(function (r) { return intOrNull(r.ITS_ID) !== null; });
  if (!source.length) throw new Error("No valid ITS_ID values were found in the workbook.");
  var unique = {}; source.forEach(function (r) { unique[intOrNull(r.ITS_ID)] = r; });
  source = Object.keys(unique).map(function (k) { return unique[k]; });
  function report(stage, done, total) { if (typeof progress === "function") progress({ stage: stage, done: done, total: total }); }

  report("Reading existing reference data", 0, source.length);
  var existing = await Promise.all([
    sbGet("sectors", "order=id.asc"), sbGet("sub_sectors", "order=id.asc"), sbGet("organisations", "order=org_id.asc"),
  ]);
  var sectors = existing[0] || [], subSectors = existing[1] || [], organisations = existing[2] || [];

  var sectorNames = {};
  source.forEach(function (r) { var n = text(r.Sector); if (n) sectorNames[n] = true; });
  var sectorIdByName = {};
  sectors.forEach(function (s) { sectorIdByName[text(s.name)] = Number(s.id); });
  var newSectorNames = Object.keys(sectorNames).sort().filter(function (n) { return !sectorIdByName[n]; });
  if (newSectorNames.length) {
    var newSectors = newSectorNames.map(function (name) { return { name: name, masool_its: null, masool_name: null, masool_phone: "", incharge_its_id: null }; });
    var insertedSectors = await sbUpsert("sectors", newSectors, "name");
    (insertedSectors || []).forEach(function (s) { sectorIdByName[text(s.name)] = Number(s.id); });
    sectors = await sbGet("sectors", "order=id.asc");
    sectors.forEach(function (s) { sectorIdByName[text(s.name)] = Number(s.id); });
  }

  var subKeySet = {};
  source.forEach(function (r) { var sector = text(r.Sector), sub = text(r.Sub_Sector); if (sector && sub) subKeySet[sector + "\u0000" + sub] = true; });
  var subSectorIdByKey = {};
  subSectors.forEach(function (s) { var sec = sectors.find(function (x) { return Number(x.id) === Number(s.sector_id); }); if (sec) subSectorIdByKey[text(sec.name) + "\u0000" + text(s.name)] = Number(s.id); });
  var newSubKeys = Object.keys(subKeySet).sort().filter(function (k) { return !subSectorIdByKey[k]; });
  if (newSubKeys.length) {
    var newSubs = newSubKeys.map(function (key) {
      var parts = key.split("\u0000"); return { sector_id: sectorIdByName[parts[0]], name: parts[1], musaid_its: null, musaid_name: null, musaid_phone: "", incharge_its_id: null };
    });
    var insertedSubs = await sbUpsert("sub_sectors", newSubs, "sector_id,name");
    (insertedSubs || []).forEach(function (s) { var sec = sectors.find(function (x) { return Number(x.id) === Number(s.sector_id); }); if (sec) subSectorIdByKey[text(sec.name) + "\u0000" + text(s.name)] = Number(s.id); });
    subSectors = await sbGet("sub_sectors", "order=id.asc");
    subSectors.forEach(function (s) { var sec = sectors.find(function (x) { return Number(x.id) === Number(s.sector_id); }); if (sec) subSectorIdByKey[text(sec.name) + "\u0000" + text(s.name)] = Number(s.id); });
  }

  // Families reference mumin_data.hof_its_id, so HOF-linked families cannot be inserted
  // until the Mumin rows exist. We first ensure Mumin records are present, then upsert families.
  report("Synchronizing Mumin records", 0, source.length);
  var muminRows = source.map(function (r) { return buildPayload(r, subSectorIdByKey); });
  await chunksUpsert("mumin_data", muminRows, "its_id", 200);
  report("Mumin records synchronized", source.length, source.length);

  report("Synchronizing families", 0, source.length);
  var familyMap = {};
  source.forEach(function (r) {
    var family = intOrNull(r.Family_ID), hof = intOrNull(r.HOF_ID);
    if (family === null) return;
    if (!familyMap[family]) familyMap[family] = { family_id: family, hof_its_id: null, sabil_no: null };
    // Only set HOF when that ITS record actually exists. This prevents the FK from
    // rejecting a family when the export contains a stale/missing HOF reference.
    if (hof !== null && !familyMap[family].hof_its_id) familyMap[family].hof_its_id = hof;
  });
  var families = Object.keys(familyMap).map(function (k) { return familyMap[k]; });
  var hofIds = {};
  families.forEach(function (f) { if (f.hof_its_id !== null) hofIds[f.hof_its_id] = true; });
  var existingHofIds = {};
  var hofList = Object.keys(hofIds);
  for (var hp = 0; hp < hofList.length; hp += 500) {
    var hofChunk = hofList.slice(hp, hp + 500);
    if (!hofChunk.length) continue;
    var foundHofs = await sbGet("mumin_data", "its_id=in.(" + hofChunk.join(",") + ")&select=its_id");
    (foundHofs || []).forEach(function (m) { existingHofIds[Number(m.its_id)] = true; });
  }
  families.forEach(function (f) { if (f.hof_its_id !== null && !existingHofIds[f.hof_its_id]) f.hof_its_id = null; });
  await chunksUpsert("families", families, "family_id", 200);

  // Resolve only ITS IDs that actually exist in mumin_data before assigning FK values.
  var inchargeIds = {};
  source.forEach(function (r) { ["Sector_Incharge", "Sector_Incharge_Female", "Sub_Sector_Incharge", "Sub_Sector_Incharge_Female"].forEach(function (prefix) { var its = intOrNull(r[prefix + "_ITSID"]); if (its !== null) inchargeIds[its] = true; }); });
  var existingInchargeIds = {};
  var idList = Object.keys(inchargeIds);
  for (var p = 0; p < idList.length; p += 500) {
    var idChunk = idList.slice(p, p + 500);
    if (!idChunk.length) continue;
    var found = await sbGet("mumin_data", "its_id=in.(" + idChunk.join(",") + ")&select=its_id");
    (found || []).forEach(function (m) { existingInchargeIds[Number(m.its_id)] = true; });
  }

  report("Linking sector incharges", 0, source.length);
  var sectorInchargeByName = {};
  source.forEach(function (r) {
    var sector = text(r.Sector); if (!sector) return;
    var current = sectorInchargeByName[sector] || {}, ic = incharge(r, "Sector_Incharge"), female = incharge(r, "Sector_Incharge_Female");
    if (!current.its && ic.its && existingInchargeIds[ic.its]) current.its = ic.its;
    if (!current.name && ic.name) current.name = ic.name;
    if (!current.femaleIts && female.its && existingInchargeIds[female.its]) current.femaleIts = female.its;
    if (!current.femaleName && female.name) current.femaleName = female.name;
    sectorInchargeByName[sector] = current;
  });
  await Promise.all(Object.keys(sectorInchargeByName).map(async function (sector) {
    var data = sectorInchargeByName[sector], id = sectorIdByName[sector]; if (!id) return;
    await sbUpdateWhere("sectors", "id=eq." + encodeURIComponent(id), { incharge_its_id: data.its || null, masool_its: data.its ? String(data.its) : null, masool_name: data.name || null });
  }));

  report("Linking sub-sector incharges", 0, source.length);
  var subInchargeByKey = {};
  source.forEach(function (r) { var sector = text(r.Sector), sub = text(r.Sub_Sector); if (!sector || !sub) return; var key = sector + "\u0000" + sub, current = subInchargeByKey[key] || {}, ic = incharge(r, "Sub_Sector_Incharge"); if (!current.its && ic.its && existingInchargeIds[ic.its]) current.its = ic.its; if (!current.name && ic.name) current.name = ic.name; subInchargeByKey[key] = current; });
  await Promise.all(Object.keys(subInchargeByKey).map(async function (key) { var id = subSectorIdByKey[key]; if (!id) return; var data = subInchargeByKey[key]; await sbUpdateWhere("sub_sectors", "id=eq." + encodeURIComponent(id), { incharge_its_id: data.its || null, musaid_its: data.its ? String(data.its) : null, musaid_name: data.name || null }); }));

  report("Synchronizing organisations", 0, source.length);
  var orgEntries = organisationEntries(source), orgByName = {};
  organisations.forEach(function (o) { orgByName[text(o.name)] = Number(o.org_id); });
  var nextOrgId = organisations.reduce(function (m, o) { return Math.max(m, Number(o.org_id) || 0); }, 0) + 1;
  var newOrgs = orgEntries.filter(function (o) { return !orgByName[o.name]; }).map(function (o) { var item = { org_id: nextOrgId++, name: o.name }; orgByName[o.name] = item.org_id; return item; });
  if (newOrgs.length) await sbUpsert("organisations", newOrgs, "name");
  organisations = organisations.concat(newOrgs);

  var memberships = [];
  orgEntries.forEach(function (o) { var orgId = orgByName[o.name]; Object.keys(o.roleByIts).forEach(function (its) { memberships.push({ its_id: Number(its), org_id: orgId, role: o.roleByIts[its] || null }); }); });
  if (memberships.length) await chunksUpsert("mumineen_organisations", memberships, "its_id,org_id", 300);

  report("Completed", source.length, source.length);

  var result = { imported: source.length, families: families.length, sectors: Object.keys(sectorNames).length, subSectors: Object.keys(subKeySet).length, organisations: orgEntries.length, memberships: memberships.length };
  await logImportRun(meta, meta && meta.analysisCounts);
  return result;
}
