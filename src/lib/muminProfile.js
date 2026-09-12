// Normalizes the extended Jamaat-export fields into one shape, reading
// from the dedicated mumin_data column when populated (queryable, fast)
// and falling back to the raw source_data JSON for older synced rows
// that predate those columns being written.
var FIELD_MAP = [
  ["occupation", "occupation", "Occupation"],
  ["subOccupation", "sub_occupation", "Sub_Occupation"],
  ["qualification", "qualification", "Qualification"],
  ["languages", "languages", "Languages"],
  ["hunars", "hunars", "Hunars"],
  ["maritalStatus", "marital_status", "Marital_Status"],
  ["bloodGroup", "blood_group", "Blood_Group"],
  ["misaq", "misaq", "Misaq"],
  ["city", "city", "City"],
  ["vatan", "vatan", "Vatan"],
  ["nationality", "nationality", "Nationality"],
  ["whatsapp", "whatsapp_no", "WhatsApp_No"],
  ["housing", "housing", "Housing"],
  ["typeOfHouse", "type_of_house", "Type_of_House"],
  ["dataVerificationStatus", "data_verification_status", "Data_Verifcation_Status"],
  ["photoVerificationStatus", "photo_verification_status", "Photo_Verifcation_Status"],
  ["quranSanad", "quran_sanad", "Quran_Sanad"],
  ["qadambosiSharaf", "qadambosi_sharaf", "Qadambosi_Sharaf"],
  ["raudatTaheraZiyarat", "raudat_tahera_ziyarat", "Raudat_Tahera_Ziyarat"],
  ["karbalaZiyarat", "karbala_ziyarat", "Karbala_Ziyarat"],
  ["asharaMubaraka", "ashara_mubaraka", "Ashara_Mubaraka"],
  ["warakatulTarkhis", "warakatul_tarkhis", "Warakatul_Tarkhis"],
  ["lastScannedEvent", "last_scanned_event", "Last_Scanned_Event"],
  ["lastScannedPlace", "last_scanned_place", "Last_Scanned_Place"],
  ["organisation", null, "Organisation"],
  ["organisationCsv", null, "Organisation_CSV"],
];

function clean(v) { return v === null || v === undefined || v === "" ? null : v; }

export function getExtendedProfile(m) {
  if (!m) return null;
  var src = m.source_data || {};
  var out = {};
  FIELD_MAP.forEach(function (entry) {
    var key = entry[0], column = entry[1], sourceKey = entry[2];
    var columnVal = column ? clean(m[column]) : null;
    out[key] = columnVal !== null ? columnVal : clean(src[sourceKey]);
  });
  out.hasSourceData = !!m.source_data;
  out.isDataVerified = !!(out.dataVerificationStatus && String(out.dataVerificationStatus).toLowerCase().indexOf("not") !== 0);
  out.isPhotoVerified = !!(out.photoVerificationStatus && String(out.photoVerificationStatus).toLowerCase().indexOf("not") !== 0);
  return out;
}

// Distinct, sorted values for a given extended field across a list of
// Mumin records — used to build filter dropdowns (City, Occupation, etc.)
export function distinctExtendedValues(muminData, field) {
  var set = {};
  (muminData || []).forEach(function (m) {
    var v = getExtendedProfile(m)[field];
    if (v) set[String(v).trim()] = true;
  });
  return Object.keys(set).sort();
}
