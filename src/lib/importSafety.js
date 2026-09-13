// Import/sync safety helpers.
// These functions validate and classify rows before any Supabase write occurs.

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  var n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function keyFor(row) {
  var itsId = numberOrNull(row.its_id);
  if (itsId !== null) return "its_id:" + itsId;
  var itsNumber = text(row.its_number);
  if (itsNumber) return "its_number:" + itsNumber;
  return "";
}

export function normalizeMuminImportRow(row) {
  var r = row || {};
  var dob = text(r.dob) || null;
  var age = numberOrNull(r.age);
  var itsId = numberOrNull(r.its_id);
  var familyId = numberOrNull(r.family_id);
  var spouseItsId = numberOrNull(r.spouse_its_id);

  return {
    its_id: itsId,
    its_number: text(r.its_number) || null,
    name: text(r.name),
    dob: dob,
    age: age,
    gender: text(r.gender) || "Male",
    phone: text(r.phone),
    email: text(r.email),
    address: text(r.address),
    area_sector: text(r.area_sector),
    sub_sector_id: numberOrNull(r.sub_sector_id),
    sabil_no: text(r.sabil_no),
    family_id: familyId,
    spouse_its_id: spouseItsId,
    status: text(r.status) || "Active",
    source_data: r.source_data && typeof r.source_data === "object" ? r.source_data : null,
  };
}

export function validateMuminImportRows(rows, existingRows) {
  var incoming = Array.isArray(rows) ? rows : [];
  var existing = Array.isArray(existingRows) ? existingRows : [];
  var existingByKey = new Map();
  var seen = new Map();
  var errors = [];
  var valid = [];

  existing.forEach(function (row) {
    var key = keyFor(row);
    if (key) existingByKey.set(key, row);
  });

  incoming.forEach(function (raw, index) {
    var row = normalizeMuminImportRow(raw);
    var rowNumber = index + 2;
    var rowErrors = [];
    var key = keyFor(row);

    if (!key) rowErrors.push("ITS_ID or ITS_NUMBER is required");
    if (!row.name) rowErrors.push("Name is required");
    if (row.age !== null && (row.age < 0 || row.age > 130)) rowErrors.push("Age must be between 0 and 130");

    if (key) {
      if (seen.has(key)) {
        rowErrors.push("Duplicate identity key in this import; first seen on row " + seen.get(key));
      } else {
        seen.set(key, rowNumber);
      }
    }

    if (row.spouse_its_id !== null && row.its_id !== null && row.spouse_its_id === row.its_id) {
      rowErrors.push("Spouse ITS_ID cannot equal the member's own ITS_ID");
    }

    if (rowErrors.length) {
      errors.push({ row: rowNumber, key: key || null, errors: rowErrors, data: row });
    } else {
      valid.push({ row: rowNumber, key: key, data: row, existing: existingByKey.get(key) || null });
    }
  });

  var newRows = valid.filter(function (x) { return !x.existing; });
  var existingRowsToUpdate = valid.filter(function (x) { return !!x.existing; });

  return {
    total: incoming.length,
    valid: valid.length,
    invalid: errors.length,
    newRows: newRows,
    updateRows: existingRowsToUpdate,
    errors: errors,
  };
}

export function buildImportPlan(rows, existingRows) {
  var validation = validateMuminImportRows(rows, existingRows);
  var updates = 0;
  var unchanged = 0;

  validation.updateRows.forEach(function (item) {
    var before = item.existing || {};
    var after = item.data || {};
    var keys = Object.keys(after).filter(function (key) { return key !== "source_data"; });
    var changed = keys.some(function (key) {
      var a = before[key] === undefined ? null : before[key];
      var b = after[key] === undefined ? null : after[key];
      return String(a === null ? "" : a) !== String(b === null ? "" : b);
    });
    if (changed) updates++; else unchanged++;
  });

  return {
    total: validation.total,
    newCount: validation.newRows.length,
    updatedCount: updates,
    unchangedCount: unchanged,
    invalidCount: validation.invalid,
    conflictCount: validation.errors.filter(function (e) {
      return e.errors.some(function (message) { return message.indexOf("Duplicate identity") >= 0; });
    }).length,
    errors: validation.errors,
    newRows: validation.newRows,
    updateRows: validation.updateRows,
  };
}

export function formatImportSafetySummary(plan) {
  return [
    plan.total + " rows scanned",
    plan.newCount + " new",
    plan.updatedCount + " changed",
    plan.unchangedCount + " unchanged",
    plan.invalidCount + " rejected",
  ].join(" · ");
}
