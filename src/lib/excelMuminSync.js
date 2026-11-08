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
function intOrNull(v) { var raw = text(v); if (!raw) return null; var n = Number(raw); return Number.isFinite(n) && n !== 0 ? Math.trunc(n) : null; }
function intOrNullAllowZero(v) { var raw = text(v); if (!raw) return null; var n = Number(raw); return Number.isFinite(n) ? Math.trunc(n) : null; }
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

function setIfPresent(obj, key, value) {
  var normalized = text(value);
  if (normalized !== "") obj[key] = normalized;
}

function buildPayload(row, subSectorIdByKey, existing) {
  var its = intOrNull(row.ITS_ID);
  var sector = text(row.Sector);
  var sub = text(row.Sub_Sector);
  var subKey = sector + "\u0000" + sub;
  var payload = {
    its_id: its,
    its_number: its === null ? "" : String(its),
    source_data: row,
  };

  // Excel is authoritative when it supplies a value, but a blank cell must
  // never erase an app-maintained value on an existing Mumin record.
  setIfPresent(payload, "name", row.Full_Name);
  setIfPresent(payload, "gender", row.Gender);
  setIfPresent(payload, "phone", row.Mobile);
  setIfPresent(payload, "email", row.Email);
  setIfPresent(payload, "address", row.Address);
  setIfPresent(payload, "area_sector", row.Sector);

  if (sector && sub && subSectorIdByKey[subKey]) {
    payload.sub_sector_id = subSectorIdByKey[subKey];
  }

  if (!existing) {
    // Keep the legacy defaults for newly created records only.
    payload.name = text(row.Full_Name);
    payload.gender = text(row.Gender) || "Male";
  }

  // An empty Inactive_Status means "no update", not "set Active".
  if (text(row.Inactive_Status)) {
    payload.status = "Inactive";
  }

  var textFields = {
    occupation: "Occupation",
    sub_occupation: "Sub_Occupation",
    qualification: "Qualification",
    languages: "Languages",
    hunars: "Hunars",
    marital_status: "Marital_Status",
    blood_group: "Blood_Group",
    misaq: "Misaq",
    city: "City",
    vatan: "Vatan",
    nationality: "Nationality",
    whatsapp_no: "WhatsApp_No",
    housing: "Housing",
    type_of_house: "Type_of_House",
    data_verification_status: "Data_Verifcation_Status",
    photo_verification_status: "Photo_Verifcation_Status",
    quran_sanad: "Quran_Sanad",
    qadambosi_sharaf: "Qadambosi_Sharaf",
    raudat_tahera_ziyarat: "Raudat_Tahera_Ziyarat",
    karbala_ziyarat: "Karbala_Ziyarat",
    warakatul_tarkhis: "Warakatul_Tarkhis",
    last_scanned_event: "Last_Scanned_Event",
    last_scanned_place: "Last_Scanned_Place",
  };
  Object.keys(textFields).forEach(function (key) {
    setIfPresent(payload, key, row[textFields[key]]);
  });

  if (text(row.Age) !== "") payload.age = intOrNullAllowZero(row.Age);
  if (text(row.Ashara_Mubaraka) !== "") payload.ashara_mubaraka = intOrNullAllowZero(row.Ashara_Mubaraka);
  if (text(row.Date_Of_Birth)) payload.dob = text(row.Date_Of_Birth);

  if (existing) {
    if (existing.dob) delete payload.dob;
    if (existing.sabil_no) delete payload.sabil_no;
    if (existing.family_id !== null && existing.family_id !== undefined) {
      payload.family_id = existing.family_id;
    } else if (intOrNull(row.Family_ID) !== null) {
      payload.family_id = intOrNull(row.Family_ID);
    }
  } else if (intOrNull(row.Family_ID) !== null) {
    payload.family_id = intOrNull(row.Family_ID);
  }

  return payload;
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

  // Preserve app-maintained fields on existing records. Fetch by ITS in bounded batches.
  report("Synchronizing Mumin records", 0, source.length);
  var existingByIts = {};
  var sourceIts = source.map(function (r) { return intOrNull(r.ITS_ID); }).filter(function (v) { return v !== null; });
  for (var ep = 0; ep < sourceIts.length; ep += 500) {
    var existingChunk = await sbGet("mumin_data", "its_id=in.(" + sourceIts.slice(ep, ep + 500).join(",") + ")");
    (existingChunk || []).forEach(function (m) { existingByIts[Number(m.its_id)] = m; });
  }
  var muminRows = source.map(function (r) { return buildPayload(r, subSectorIdByKey, existingByIts[intOrNull(r.ITS_ID)]); });
  // Avoid the spouse-normalization trigger nulling links to members in later chunks.
  muminRows.forEach(function (m) { delete m.spouse_its_id; });
  await chunksUpsert("mumin_data", muminRows, "its_id", 200);
  // Second pass: link only spouse ITS values explicitly supplied and now present.
  var spouseLinks = {};
  source.forEach(function (r) {
    var its = intOrNull(r.ITS_ID), spouse = intOrNull(r.Spouse_ITS_ID);
    if (its !== null && spouse !== null) spouseLinks[its] = spouse;
  });
  var spouseIds = Object.keys(spouseLinks).map(Number);
  var presentIts = {};
  for (var sp = 0; sp < spouseIds.length; sp += 500) {
    var present = await sbGet("mumin_data", "its_id=in.(" + spouseIds.slice(sp, sp + 500).concat(spouseIds.slice(sp, sp + 500).map(function (id) { return spouseLinks[id]; })).filter(function (id, index, arr) { return arr.indexOf(id) === index; }).join(",") + ")&select=its_id");
    (present || []).forEach(function (m) { presentIts[Number(m.its_id)] = true; });
  }
  for (var sl = 0; sl < spouseIds.length; sl++) {
    var personIts = spouseIds[sl], spouseIts = spouseLinks[personIts];
    if (presentIts[personIts] && presentIts[spouseIts]) await sbUpdateWhere("mumin_data", "its_id=eq." + personIts, { spouse_its_id: spouseIts });
  }
  report("Mumin records synchronized", source.length, source.length);

  // ── Families ────────────────────────────────────────────────────
  // NOTE: the ensure_family_for_mumin_import trigger creates a blank family
  // row (hof_its_id = NULL) as each Mumin row is upserted above. So by this
  // point nearly every family already exists, and "only insert missing
  // families" would never set a HOF. We therefore (a) insert any family still
  // missing, and (b) back-fill hof_its_id on existing families where it is
  // NULL. A HOF already set in the app is never overwritten.
  report("Synchronizing families", 0, source.length);
  var familyMap = {};
  source.forEach(function (r) {
    var family = intOrNull(r.Family_ID);
    if (family === null) return;
    var its = intOrNull(r.ITS_ID);
    var hof = intOrNull(r.HOF_ID);
    // A row typed HOF with no HOF_ID heads its own family.
    if (hof === null && text(r.HOF_FM_TYPE).toUpperCase() === "HOF") hof = its;
    if (!familyMap[family]) familyMap[family] = { family_id: family, hof_its_id: null, sabil_no: null };
    if (hof !== null && !familyMap[family].hof_its_id) familyMap[family].hof_its_id = hof;
  });
  var families = Object.keys(familyMap).map(function (k) { return familyMap[k]; });

  // Only reference HOFs that actually exist in mumin_data (FK safety).
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

  var existingFamilyRows = await sbGet("families", "select=family_id,hof_its_id");
  var existingFamilyById = {};
  (existingFamilyRows || []).forEach(function (f) { existingFamilyById[String(f.family_id)] = f; });

  var newFamilies = families.filter(function (f) { return !existingFamilyById[String(f.family_id)]; });
  if (newFamilies.length) await chunksUpsert("families", newFamilies, "family_id", 200);

  // Back-fill HOF on existing families that still have none.
  var hofBackfill = families.filter(function (f) {
    var row = existingFamilyById[String(f.family_id)];
    return row && (row.hof_its_id === null || row.hof_its_id === undefined) && f.hof_its_id !== null;
  });
  for (var hb = 0; hb < hofBackfill.length; hb += 20) {
    await Promise.all(hofBackfill.slice(hb, hb + 20).map(function (f) {
      return sbUpdateWhere("families", "family_id=eq." + encodeURIComponent(f.family_id) + "&hof_its_id=is.null", { hof_its_id: f.hof_its_id });
    }));
  }

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
    var patch = {};
    // Never overwrite a Masool already assigned in the app; only fill blanks.
    var currentSector = sectors.find(function (s) { return Number(s.id) === Number(id); }) || {};
    var hasMasool = !!(text(currentSector.masool_its) || text(currentSector.masool_name) || currentSector.incharge_its_id);
    if (!hasMasool) {
      if (data.its) { patch.incharge_its_id = data.its; patch.masool_its = String(data.its); }
      if (data.name) patch.masool_name = data.name;
    }
    if (Object.keys(patch).length) await sbUpdateWhere("sectors", "id=eq." + encodeURIComponent(id), patch);
  }));

  report("Linking sub-sector incharges", 0, source.length);
  var subInchargeByKey = {};
  source.forEach(function (r) {
    var sector = text(r.Sector), sub = text(r.Sub_Sector); if (!sector || !sub) return;
    var key = sector + "\u0000" + sub, current = subInchargeByKey[key] || {}, ic = incharge(r, "Sub_Sector_Incharge");
    if (!current.its && ic.its && existingInchargeIds[ic.its]) current.its = ic.its;
    if (!current.name && ic.name) current.name = ic.name;
    subInchargeByKey[key] = current;
  });
  await Promise.all(Object.keys(subInchargeByKey).map(async function (key) {
    var id = subSectorIdByKey[key]; if (!id) return;
    var data = subInchargeByKey[key], patch = {};
    // Never overwrite a Musaid already assigned in the app; only fill blanks.
    var currentSub = subSectors.find(function (s) { return Number(s.id) === Number(id); }) || {};
    var hasMusaid = !!(text(currentSub.musaid_its) || text(currentSub.musaid_name) || currentSub.incharge_its_id);
    if (!hasMusaid) {
      if (data.its) { patch.incharge_its_id = data.its; patch.musaid_its = String(data.its); }
      if (data.name) patch.musaid_name = data.name;
    }
    if (Object.keys(patch).length) await sbUpdateWhere("sub_sectors", "id=eq." + encodeURIComponent(id), patch);
  }));

  report("Synchronizing organisations", 0, source.length);
  var result = {
    imported: source.length, families: families.length, hofsBackfilled: hofBackfill.length,
    sectors: Object.keys(sectorNames).length, subSectors: Object.keys(subKeySet).length,
    organisations: 0, memberships: 0,
  };
  try {
    var orgEntries = organisationEntries(source), orgByName = {};
    organisations.forEach(function (o) { orgByName[text(o.name)] = Number(o.org_id); });
    var nextOrgId = organisations.reduce(function (m, o) { return Math.max(m, Number(o.org_id) || 0); }, 0) + 1;
    var newOrgs = orgEntries.filter(function (o) { return !orgByName[o.name]; }).map(function (o) { var item = { org_id: nextOrgId++, name: o.name }; orgByName[o.name] = item.org_id; return item; });
    if (newOrgs.length) await sbUpsert("organisations", newOrgs, "name");
    organisations = organisations.concat(newOrgs);

    // mumineen_organisations references mumin_data.id (mumin_id), not its_id —
    // resolve each ITS number to its internal row id before linking.
    var allIts = [];
    orgEntries.forEach(function (o) { Object.keys(o.roleByIts).forEach(function (its) { allIts.push(Number(its)); }); });
    var idByIts = {};
    for (var op = 0; op < allIts.length; op += 500) {
      var chunk = allIts.slice(op, op + 500);
      if (!chunk.length) continue;
      var foundRows = await sbGet("mumin_data", "its_id=in.(" + chunk.join(",") + ")&select=id,its_id");
      (foundRows || []).forEach(function (m) { idByIts[Number(m.its_id)] = Number(m.id); });
    }

    var memberships = [];
    orgEntries.forEach(function (o) {
      var orgId = orgByName[o.name];
      Object.keys(o.roleByIts).forEach(function (its) {
        var muminId = idByIts[Number(its)];
        if (!muminId) return; // ITS not resolvable — skip this link rather than fail the whole sync
        memberships.push({ mumin_id: muminId, org_id: orgId, role: o.roleByIts[its] || null });
      });
    });
    if (memberships.length) await chunksUpsert("mumineen_organisations", memberships, "mumin_id,org_id", 300);

    result.organisations = orgEntries.length;
    result.memberships = memberships.length;
  } catch (orgErr) {
    // Organisation/membership linking is supplementary. A failure here must
    // never make an otherwise-successful Mumin/Family sync look like it failed.
    result.organisationSyncError = orgErr.message || String(orgErr);
  }

  report("Completed", source.length, source.length);
  await logImportRun(meta, meta && meta.analysisCounts);
  return result;
}
