import { sbDelete, sbGet, sbInsert, sbUpdate, sbUpdateWhere } from "./supabase.js";

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
  }
  var existing = await sbGet("families", "family_id=eq." + id);
  if (existing.length) throw new Error("Family ID " + id + " already exists.");
  return sbInsert("families", { family_id: id, sabil_no: sabilNo || null, hof_its_id: hof });
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

  // Clear the source HOF first so the source family can be removed safely.
  if (sourceRows[0].hof_its_id) await updateFamily(source, { hof_its_id: null });
  if (members.length) await sbUpdateWhere("mumin_data", "family_id=eq." + source, { family_id: target });
  await sbDelete("families", source);
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
  await sbInsert("families", { family_id: target, sabil_no: sabilNo || null, hof_its_id: hof });
  for (var i = 0; i < ids.length; i++) {
    await sbUpdateWhere("mumin_data", "its_id=eq." + ids[i], { family_id: target });
  }

  if (sourceRows[0].hof_its_id && ids.indexOf(Number(sourceRows[0].hof_its_id)) !== -1) {
    await updateFamily(source, { hof_its_id: null });
  }
  return { moved: ids.length, newFamilyId: target };
}
