import { sbDeleteWhere, sbGet, sbInsert, sbUpdateWhere } from "./supabase.js";

function num(value) {
  if (value === null || value === undefined || value === "") return null;
  var n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function getFamilyMembers(familyId) {
  return sbGet("mumin_data", "family_id=eq." + encodeURIComponent(familyId) + "&order=name.asc");
}

export async function createFamily(familyId, sabilNo, hofItsId) {
  var id = num(familyId);
  if (id === null) throw new Error("Enter a valid Family ID.");
  var hof = num(hofItsId);
  if (hof !== null) {
    var people = await sbGet("mumin_data", "its_id=eq." + hof);
    if (!people.length) throw new Error("Selected HOF does not exist in Mumin data.");
    if (people[0].family_id !== null && people[0].family_id !== undefined) throw new Error("Selected HOF already belongs to another family.");
  }
  var existing = await sbGet("families", "family_id=eq." + id);
  if (existing.length) throw new Error("Family ID " + id + " already exists.");
  var created = await sbInsert("families", { family_id: id, sabil_no: sabilNo || null, hof_its_id: hof });
  // Keep the HOF's app-side family_id aligned with the family row. Compensate
  // by removing the new family if the HOF assignment fails.
  if (hof !== null) {
    try {
      await sbUpdateWhere("mumin_data", "its_id=eq." + hof, { family_id: id });
    } catch (e) {
      try { await sbDeleteWhere("families", "family_id=eq." + id); } catch (_rollbackError) {}
      throw new Error("Family creation could not assign the HOF; rollback was attempted. " + (e.message || ""));
    }
  }
  return created;
}

export async function updateFamily(familyId, values) {
  var body = {};
  if (Object.prototype.hasOwnProperty.call(values, "sabil_no")) body.sabil_no = values.sabil_no || null;
  if (Object.prototype.hasOwnProperty.call(values, "hof_its_id")) {
    var hof = num(values.hof_its_id);
    if (hof !== null) {
      var people = await sbGet("mumin_data", "its_id=eq." + hof);
      if (!people.length) throw new Error("Selected HOF does not exist in Mumin data.");
      if (String(people[0].family_id) !== String(familyId)) {
        throw new Error("The HOF must first belong to this family. Move the member into the family before assigning HOF.");
      }
    }
    body.hof_its_id = hof;
  }
  return sbUpdateWhere("families", "family_id=eq." + encodeURIComponent(familyId), body);
}

export async function moveMember(itsId, familyId) {
  var its = num(itsId);
  var family = num(familyId);
  if (its === null) throw new Error("Invalid ITS number.");
  if (family === null) throw new Error("Invalid Family ID.");
  var people = await sbGet("mumin_data", "its_id=eq." + its);
  if (!people.length) throw new Error("Mumin not found.");
  var target = await sbGet("families", "family_id=eq." + family);
  if (!target.length) throw new Error("Target family does not exist.");
  var sourceFamilyId = people[0].family_id;
  if (sourceFamilyId !== null && sourceFamilyId !== undefined && String(sourceFamilyId) !== String(family)) {
    var sourceRows = await sbGet("families", "family_id=eq." + encodeURIComponent(sourceFamilyId));
    if (sourceRows.length && String(sourceRows[0].hof_its_id) === String(its)) {
      throw new Error("This Mumin is the current HOF of Family " + sourceFamilyId + ". Assign another HOF to that family before moving this member.");
    }
  }
  return sbUpdateWhere("mumin_data", "its_id=eq." + its, { family_id: family });
}

export async function mergeFamilies(targetFamilyId, sourceFamilyId) {
  var target = num(targetFamilyId);
  var source = num(sourceFamilyId);
  if (target === null || source === null || target === source) throw new Error("Choose two different valid families.");
  var targetRows = await sbGet("families", "family_id=eq." + target);
  var sourceRows = await sbGet("families", "family_id=eq." + source);
  if (!targetRows.length || !sourceRows.length) throw new Error("Both families must exist.");
  var members = await getFamilyMembers(source);

  // Validate before mutation and compensate if any write fails. This is not a
  // database transaction; the rollback is best-effort until server-side RPCs exist.
  var originalHof = sourceRows[0].hof_its_id;
  if (originalHof && !members.some(function (m) { return String(m.its_id) === String(originalHof); })) {
    throw new Error("Source HOF is not linked to the source family. Merge cancelled to avoid hiding an inconsistent record.");
  }
  try {
    if (originalHof) await updateFamily(source, { hof_its_id: null });
    if (members.length) await sbUpdateWhere("mumin_data", "family_id=eq." + source, { family_id: target });
    await sbDeleteWhere("families", "family_id=eq." + source);
  } catch (e) {
    try {
      if (members.length) await sbUpdateWhere("mumin_data", "its_id=in.(" + members.map(function (m) { return m.its_id; }).join(",") + ")", { family_id: source });
    } catch (_rollbackMembersError) {}
    try { if (originalHof) await sbUpdateWhere("families", "family_id=eq." + source, { hof_its_id: originalHof }); } catch (_rollbackHofError) {}
    throw new Error("Family merge failed; rollback was attempted. " + (e.message || ""));
  }
  return { moved: members.length };
}

export async function splitFamily(sourceFamilyId, memberItsIds, newFamilyId, sabilNo, newHofItsId) {
  var source = num(sourceFamilyId);
  var target = num(newFamilyId);
  if (source === null || target === null || source === target) throw new Error("Choose a different valid Family ID for the new family.");
  var sourceRows = await sbGet("families", "family_id=eq." + source);
  if (!sourceRows.length) throw new Error("Source family does not exist.");
  var targetRows = await sbGet("families", "family_id=eq." + target);
  if (targetRows.length) throw new Error("New Family ID already exists.");
  var ids = (memberItsIds || []).map(num).filter(function (v) { return v !== null; });
  if (!ids.length) throw new Error("Select at least one member to move.");

  var sourceMembers = await getFamilyMembers(source);
  var allowed = {};
  sourceMembers.forEach(function (m) { allowed[String(m.its_id)] = true; });
  ids.forEach(function (id) {
    if (!allowed[String(id)]) throw new Error("ITS " + id + " is not a member of the source family.");
  });

  var hof = num(newHofItsId);
  if (hof !== null && ids.indexOf(hof) === -1) throw new Error("The new HOF must be one of the selected members.");
  if (sourceRows[0].hof_its_id && ids.indexOf(Number(sourceRows[0].hof_its_id)) !== -1) {
    throw new Error("The current HOF is selected to move. Assign a replacement HOF to the source family first, then split the family.");
  }
  await sbInsert("families", { family_id: target, sabil_no: sabilNo || null, hof_its_id: hof });
  var moved = [];
  try {
    for (var i = 0; i < ids.length; i++) {
      await sbUpdateWhere("mumin_data", "its_id=eq." + ids[i], { family_id: target });
      moved.push(ids[i]);
    }
  } catch (e) {
    for (var j = 0; j < moved.length; j++) {
      try { await sbUpdateWhere("mumin_data", "its_id=eq." + moved[j], { family_id: source }); } catch (_rollbackMemberError) {}
    }
    try { await sbDeleteWhere("families", "family_id=eq." + target); } catch (_rollbackFamilyError) {}
    throw new Error("Family split failed; rollback was attempted. " + (e.message || ""));
  }
  return { moved: ids.length, newFamilyId: target };
}
