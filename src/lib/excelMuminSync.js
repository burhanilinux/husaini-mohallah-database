import * as XLSX from "xlsx";
import { sbGet, sbUpsert } from "./supabase.js";

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

function text(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function intOrNull(v) {
  var n = Number(text(v));
  return Number.isFinite(n) && n !== 0 ? Math.trunc(n) : null;
}

function cleanRow(row) {
  var out = {};
  Object.keys(row || {}).forEach(function (k) { out[k] = row[k] === undefined || row[k] === null ? "" : row[k]; });
  return out;
}

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
      var value = text(raw);
      if (!value) return;
      var bits = value.split(/\s+-\s+/);
      var name = text(bits[0]);
      if (!name) return;
      var role = bits.length > 1 ? text(bits.slice(1).join(" - ")) : null;
      map[name] = map[name] || { name: name, roleByIts: {} };
      var its = intOrNull(r.ITS_ID);
      if (its) map[name].roleByIts[its] = role || null;
    });
  });
  return Object.keys(map).sort().map(function (k) { return map[k]; });
}

function incharge(row, prefix) {
  var itsKey = prefix + "_ITSID";
  var nameKey = prefix + "_Name";
  return { its: intOrNull(row[itsKey]), name: text(row[nameKey]) };
}

function buildPayload(row, sectorIdByName, subSectorIdByKey) {
  var its = intOrNull(row.ITS_ID);
  var sector = text(row.Sector);
  var sub = text(row.Sub_Sector);
  var subKey = sector + "\u0000" + sub;

  // IMPORTANT: mumin_data.id is GENERATED ALWAYS AS IDENTITY in PostgreSQL.
  // Never send the Excel ITS_ID as `id`; let PostgreSQL generate the row id.
  // ITS_ID is the stable application/business key and is stored in its_id.
  return {
    its_id: its,
    its_number: its === null ? "" : String(its),
    name: text(row.Full_Name),
    dob: null,
    age: intOrNull(row.Age),
    gender: text(row.Gender) || "Male",
    phone: text(row.Mobile),
    email: text(row.Email),
    address: text(row.Address),
    area_sector: sector,
    sub_sector_id: subSectorIdByKey[subKey] || null,
    sabil_no: null,
    status: text(row.Inactive_Status) ? "Inactive" : "Active",
    family_id: intOrNull(row.Family_ID),
    spouse_its_id: intOrNull(row.Spouse_ITS_ID),
    source_data: row,
  };
}

async function chunksUpsert(table, rows, conflict, chunkSize) {
  var count = 0;
  for (var i = 0; i < rows.length; i += chunkSize) {
    var chunk = rows.slice(i, i + chunkSize);
    if (!chunk.length) continue;
    await sbUpsert(table, chunk, conflict);
    count += chunk.length;
  }
  return count;
}

export async function syncMuminExcel(rows, progress) {
  var source = rows.map(cleanRow).filter(function (r) { return intOrNull(r.ITS_ID) !== null; });
  if (!source.length) throw new Error("No valid ITS_ID values were found in the workbook.");

  var unique = {};
  source.forEach(function (r) { unique[intOrNull(r.ITS_ID)] = r; });
  source = Object.keys(unique).map(function (k) { return unique[k]; });

  function report(stage, done, total) {
    if (typeof progress === "function") progress({ stage: stage, done: done, total: total });
  }

  report("Reading existing reference data", 0, source.length);
  var existing = await Promise.all([
    sbGet("sectors", "order=id.asc"),
    sbGet("sub_sectors", "order=id.asc"),
    sbGet("organisations", "order=org_id.asc"),
  ]);
  var sectors = existing[0] || [];
  var subSectors = existing[1] || [];
  var organisations = existing[2] || [];

  var sectorNames = {};
  source.forEach(function (r) { var n = text(r.Sector); if (n) sectorNames[n] = true; });
  var sectorIdByName = {};
  sectors.forEach(function (s) { sectorIdByName[text(s.name)] = Number(s.id); });
  var newSectorNames = Object.keys(sectorNames).sort().filter(function (n) { return !sectorIdByName[n]; });
  if (newSectorNames.length) {
    var newSectors = newSectorNames.map(function (name) {
      var row = source.find(function (r) { return text(r.Sector) === name; }) || {};
      var ic = incharge(row, "Sector_Incharge");
      return {
        name: name,
        masool_its: ic.its ? String(ic.its) : null,
        masool_name: ic.name || null,
        masool_phone: "",
        incharge_its_id: ic.its || null,
      };
    });
    // Do not provide `id`: sectors.id is also GENERATED ALWAYS AS IDENTITY.
    var insertedSectors = await sbUpsert("sectors", newSectors, "name");
    (insertedSectors || []).forEach(function (s) { sectorIdByName[text(s.name)] = Number(s.id); });
    // In case the API response is restricted, refresh the reference rows.
    if (newSectorNames.some(function (n) { return !sectorIdByName[n]; })) {
      sectors = await sbGet("sectors", "order=id.asc");
      sectors.forEach(function (s) { sectorIdByName[text(s.name)] = Number(s.id); });
    }
  }

  var subKeySet = {};
  source.forEach(function (r) {
    var sector = text(r.Sector), sub = text(r.Sub_Sector);
    if (sector && sub) subKeySet[sector + "\u0000" + sub] = true;
  });
  var subSectorIdByKey = {};
  subSectors.forEach(function (s) {
    var sec = sectors.find(function (x) { return Number(x.id) === Number(s.sector_id); });
    if (sec) subSectorIdByKey[text(sec.name) + "\u0000" + text(s.name)] = Number(s.id);
  });
  // Include newly created sectors when resolving sub-sector foreign keys.
  if (newSectorNames.length) {
    sectors = await sbGet("sectors", "order=id.asc");
    sectors.forEach(function (s) { sectorIdByName[text(s.name)] = Number(s.id); });
  }
  var newSubKeys = Object.keys(subKeySet).sort().filter(function (k) { return !subSectorIdByKey[k]; });
  if (newSubKeys.length) {
    var newSubs = newSubKeys.map(function (key) {
      var parts = key.split("\u0000"), sector = parts[0], sub = parts[1];
      var row = source.find(function (r) { return text(r.Sector) === sector && text(r.Sub_Sector) === sub; }) || {};
      var ic = incharge(row, "Sub_Sector_Incharge");
      return {
        sector_id: sectorIdByName[sector],
        name: sub,
        musaid_its: ic.its ? String(ic.its) : null,
        musaid_name: ic.name || null,
        musaid_phone: "",
        incharge_its_id: ic.its || null,
      };
    });
    // Do not provide `id`: sub_sectors.id is GENERATED ALWAYS AS IDENTITY.
    var insertedSubs = await sbUpsert("sub_sectors", newSubs, "sector_id,name");
    (insertedSubs || []).forEach(function (s) {
      var sec = sectors.find(function (x) { return Number(x.id) === Number(s.sector_id); });
      if (sec) subSectorIdByKey[text(sec.name) + "\u0000" + text(s.name)] = Number(s.id);
    });
    if (newSubKeys.some(function (k) { return !subSectorIdByKey[k]; })) {
      subSectors = await sbGet("sub_sectors", "order=id.asc");
      subSectors.forEach(function (s) {
        var sec = sectors.find(function (x) { return Number(x.id) === Number(s.sector_id); });
        if (sec) subSectorIdByKey[text(sec.name) + "\u0000" + text(s.name)] = Number(s.id);
      });
    }
  }

  report("Synchronizing Mumin records", 0, source.length);
  var muminRows = source.map(function (r) { return buildPayload(r, sectorIdByName, subSectorIdByKey); });
  // mumin_data.id is generated by PostgreSQL; conflict is on the business key its_id.
  await chunksUpsert("mumin_data", muminRows, "its_id", 200);
  report("Mumin records synchronized", source.length, source.length);

  report("Synchronizing families", 0, source.length);
  var familyMap = {};
  source.forEach(function (r) {
    var family = intOrNull(r.Family_ID), hof = intOrNull(r.HOF_ID);
    if (family === null) return;
    if (!familyMap[family]) familyMap[family] = { family_id: family, hof_its_id: hof, sabil_no: null };
    else if (!familyMap[family].hof_its_id && hof) familyMap[family].hof_its_id = hof;
  });
  var families = Object.keys(familyMap).map(function (k) { return familyMap[k]; });
  await chunksUpsert("families", families, "family_id", 200);

  // Re-upsert members after families/reference rows exist so all FK fields are valid.
  await chunksUpsert("mumin_data", muminRows, "its_id", 200);

  report("Synchronizing organisations", 0, source.length);
  var orgEntries = organisationEntries(source);
  var orgByName = {};
  organisations.forEach(function (o) { orgByName[text(o.name)] = Number(o.org_id); });
  var nextOrgId = organisations.reduce(function (m, o) { return Math.max(m, Number(o.org_id) || 0); }, 0) + 1;
  var newOrgs = orgEntries.filter(function (o) { return !orgByName[o.name]; }).map(function (o) {
    var item = { org_id: nextOrgId++, name: o.name };
    orgByName[o.name] = item.org_id;
    return item;
  });
  if (newOrgs.length) await sbUpsert("organisations", newOrgs, "name");
  organisations = organisations.concat(newOrgs);

  var memberships = [];
  orgEntries.forEach(function (o) {
    var orgId = orgByName[o.name];
    Object.keys(o.roleByIts).forEach(function (its) {
      memberships.push({ its_id: Number(its), org_id: orgId, role: o.roleByIts[its] || null });
    });
  });
  if (memberships.length) await chunksUpsert("mumineen_organisations", memberships, "its_id,org_id", 300);

  report("Completed", source.length, source.length);
  return {
    imported: source.length,
    families: families.length,
    sectors: Object.keys(sectorNames).length,
    subSectors: Object.keys(subKeySet).length,
    organisations: orgEntries.length,
    memberships: memberships.length,
  };
}
