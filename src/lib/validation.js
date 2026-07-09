// ── Field validators ──────────────────────────────────────────────
export function validatePhone(phone) {
  if (!phone) return true; // optional
  var cleaned = phone.replace(/[^0-9+]/g, "");
  return cleaned.length >= 7 && cleaned.length <= 15;
}

export function validateEmail(email) {
  if (!email) return true; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateITS(its) {
  if (!its) return false;
  return /^[0-9]{8}$/.test(its.trim());
}

// ── Duplicate warning detectors (non-blocking) ────────────────────
/**
 * Checks for likely-duplicate records beyond the ITS number (which is
 * already hard-blocked in validateMuminForm). These are surfaced as
 * warnings, not errors, since a shared phone (e.g. spouse/family) or a
 * name+DOB coincidence can be legitimate.
 * @param {object} form
 * @param {Array}  existingMumin
 * @param {number|null} editId
 * @returns {string[]} warning messages (empty = no duplicates found)
 */
export function getMuminDuplicateWarnings(form, existingMumin, editId) {
  var warnings = [];
  var list = (existingMumin || []).filter(function (m) {
    return m.id !== editId && !m.deleted_at;
  });

  if (form.phone && form.phone.trim()) {
    var cleanedPhone = form.phone.replace(/[^0-9]/g, "");
    if (cleanedPhone.length >= 7) {
      var phoneDupes = list.filter(function (m) {
        return m.phone && m.phone.replace(/[^0-9]/g, "") === cleanedPhone;
      });
      if (phoneDupes.length > 0) {
        var names = phoneDupes.map(function (m) { return m.name; }).join(", ");
        warnings.push("This phone number is already used by: " + names + ". This may be intentional (e.g. a shared family number).");
      }
    }
  }

  if (form.name && form.name.trim() && form.dob) {
    var nameNorm = form.name.trim().toLowerCase();
    var nameDobDupe = list.find(function (m) {
      return m.name && m.name.trim().toLowerCase() === nameNorm && m.dob === form.dob;
    });
    if (nameDobDupe) {
      warnings.push("A record with the same name and date of birth already exists (ITS: " + nameDobDupe.its_number + "). Please confirm this isn't a duplicate entry.");
    }
  }

  return warnings;
}

// ── Form-level validators ─────────────────────────────────────────
/**
 * Validates the Mumin add/edit form.
 * @param {object} form        - current form state
 * @param {Array}  existingMumin - all current mumin_data records (for duplicate ITS check)
 * @param {number|null} editId - id of record being edited (null when adding)
 * @returns {string[]}         - array of error messages (empty = valid)
 */
export function validateMuminForm(form, existingMumin, editId) {
  var errors = [];

  if (!form.name || !form.name.trim()) {
    errors.push("Name is required.");
  }

  if (!form.its_number || !form.its_number.trim()) {
    errors.push("ITS Number is required.");
  } else if (!validateITS(form.its_number)) {
    errors.push("ITS Number must be exactly 8 digits.");
  } else {
    var dup = (existingMumin || []).find(function (m) {
      return m.its_number === form.its_number.trim()
        && m.id !== editId
        && !m.deleted_at;
    });
    if (dup) {
      errors.push("ITS Number " + form.its_number + " is already used by " + dup.name + ".");
    }
  }

  if (form.phone && !validatePhone(form.phone)) {
    errors.push("Phone number looks invalid.");
  }

  if (form.email && !validateEmail(form.email)) {
    errors.push("Email address looks invalid.");
  }

  if (form.dob) {
    var d = new Date(form.dob);
    if (isNaN(d.getTime()) || d > new Date()) {
      errors.push("Date of Birth cannot be in the future.");
    }
  }

  return errors;
}

/**
 * Validates the Umoor File add/edit form.
 * @param {object} form - current form state
 * @returns {string[]}  - array of error messages (empty = valid)
 */
export function validateFileForm(form) {
  var errors = [];
  if (!form.title || !form.title.trim()) errors.push("File title is required.");
  if (!form.umoor_type)                  errors.push("Please select an Umoor type.");
  if (!form.year)                        errors.push("Please select a year.");
  return errors;
}
