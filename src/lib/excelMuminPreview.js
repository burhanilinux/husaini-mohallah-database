import { SOURCE_COLUMNS } from "./excelMuminSync.js";

function text(v) { return v === null || v === undefined ? "" : String(v).trim(); }
function intOrNull(v) { var n = Number(text(v)); return Number.isFinite(n) && n !== 0 ? Math.trunc(n) : null; }
function clean(v) { return text(v); }

// ── Column drift guard ──────────────────────────────────────────────
export function checkColumnDrift(rows) {
  var uploaded = rows && rows.length ? Object.keys(rows[0]) : [];
  var missing = SOURCE_COLUMNS.filter(function (c) { return uploaded.indexOf(c) === -1; });
  // Ignore auto-generated placeholder headers Excel parsers emit for blank
  // header cells (e.g. "__EMPTY", "__EMPTY_1") — not a real extra column.
  var extra = uploaded.filter(function (c) { return SOURCE_COLUMNS.indexOf(c) === -1 && !/^__EMPTY/.test(c); });
  return {
    uploadedCount: uploaded.length,
    expectedCount: SOURCE_COLUMNS.length,
    missing: missing,
    extra: extra,
    ok: missing.length === 0,
  };
}

// ── Synchronization preview ───────────────────────────────────────────
export function analyzeMuminExcel(rows, existingRows, existingSectorNames) {
  var source = Array.isArray(rows) ? rows : [];
  var existing = Array.isArray(existingRows) ? existingRows : [];
  var knownSectors = {};
  (existingSectorNames || []).forEach(function (s) { if (s) knownSectors[text(s)] = true; });

  var existingByIts = {};
  existing.forEach(function (m) {
    var its = intOrNull(m.its_id !== undefined ? m.its_id : m.its_number);
    if (its !== null) existingByIts[its] = m;
  });

  var counts = { new: 0, updated: 0, unchanged: 0, conflicts: 0, invalid: 0 };
  var details = { new: [], updated: [], unchanged: [], conflicts: [], invalid: [] };
  var seen = {}; // its -> array of row numbers
  var incomingSectors = {};
  var selfHeadedFM = [];

  source.forEach(function (r, index) {
    var row = index + 2;
    var its = intOrNull(r.ITS_ID);
    var name = text(r.Full_Name);
    if (its === null) {
      counts.invalid++;
      details.invalid.push({ row: row, its: "—", name: name, reason: "Missing or invalid ITS_ID" });
      return;
    }
    seen[its] = seen[its] || [];
    seen[its].push(row);

    var sector = text(r.Sector);
    if (sector) incomingSectors[sector] = true;

    var family = intOrNull(r.Family_ID);
    var hofId = intOrNull(r.HOF_ID);

    if (text(r.HOF_FM_TYPE) === "FM" && hofId === null && family === its) {
      selfHeadedFM.push({ row: row, its: its, name: name || "Unnamed" });
    }

    var current = existingByIts[its];
    if (!current) {
      counts.new++;
      details.new.push({ row: row, its: its, name: name || "Unnamed" });
      return;
    }

    var changes = [];
    function diff(label, incoming, stored) {
      if (clean(incoming) !== clean(stored)) changes.push(label);
    }
    diff("Name", r.Full_Name, current.name);
    diff("Age", r.Age, current.age);
    diff("Gender", r.Gender || "Male", current.gender || "Male");
    diff("Mobile", r.Mobile, current.phone);
    diff("Email", r.Email, current.email);
    diff("Address", r.Address, current.address);
    diff("Sector", r.Sector, current.area_sector);
    diff("Family", r.Family_ID, current.family_id);
    diff("Spouse", r.Spouse_ITS_ID, current.spouse_its_id);
    diff("Status", text(r.Inactive_Status) ? "Inactive" : "Active", current.status);

    if (changes.length) {
      counts.updated++;
      details.updated.push({ row: row, its: its, name: name || current.name || "Unnamed", changes: changes });
    } else {
      counts.unchanged++;
      details.unchanged.push({ row: row, its: its, name: name || current.name || "Unnamed" });
    }

    if (hofId !== null && family !== null) {
      var hofInSource = source.some(function (x) { return intOrNull(x.ITS_ID) === hofId; });
      if (!hofInSource && !existingByIts[hofId]) {
        counts.conflicts++;
        details.conflicts.push({ row: row, its: its, name: name, reason: "HOF_ID " + hofId + " is not present in the workbook or current database" });
      }
    }
  });

  Object.keys(seen).forEach(function (its) {
    if (seen[its].length > 1) {
      counts.conflicts++;
      details.conflicts.push({ row: seen[its].join(", "), its: Number(its), name: "", reason: "Duplicate ITS_ID appears " + seen[its].length + " times (rows " + seen[its].join(", ") + ")" });
    }
  });

  var newSectors = Object.keys(incomingSectors)
    .filter(function (s) { return !knownSectors[s]; })
    .sort();

  return {
    counts: counts,
    details: details,
    blocking: counts.invalid > 0 || details.conflicts.some(function (x) { return String(x.reason).indexOf("Duplicate ITS_ID") === 0; }),
    newSectors: newSectors,
    selfHeadedFM: selfHeadedFM,
  };
}
