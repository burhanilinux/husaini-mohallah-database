// ── Umoor Types ───────────────────────────────────────────────────
export const UMOOR_TYPES = [
  "Umoor Talimiyah (Education)",
  "Umoor Mawarid Bashariyah (Human Resources)",
  "Umoor Marafiq Burhaniyah (Upliftment)",
  "Umoor Maliyah (Finance)",
  "Umoor Kharejiyah (Public Relations)",
  "Umoor Iqtesadiyah (Qardan Hasanah)",
  "Umoor Faizul Mawaid Burhaniyah (FMB)",
  "Umoor Deeniyah (Deeni Umoor)",
  "Umoor Al-Sehaat (Medical)",
  "Umoor Al-Qaza (Legal)",
  "Umoor Dakheliyah (I.T)",
  "Umoor Al-Amlaak (Trusts & Properties)",
];

export const UMOOR_PREFIX = {
  "Umoor Talimiyah (Education)":             "TAL",
  "Umoor Mawarid Bashariyah (Human Resources)": "MWB",
  "Umoor Marafiq Burhaniyah (Upliftment)":   "MFB",
  "Umoor Maliyah (Finance)":                 "MAL",
  "Umoor Kharejiyah (Public Relations)":     "KHA",
  "Umoor Iqtesadiyah (Qardan Hasanah)":      "IQT",
  "Umoor Faizul Mawaid Burhaniyah (FMB)":    "FMB",
  "Umoor Deeniyah (Deeni Umoor)":            "DEE",
  "Umoor Al-Sehaat (Medical)":               "SEH",
  "Umoor Al-Qaza (Legal)":                   "QAZ",
  "Umoor Dakheliyah (I.T)":                  "DAK",
  "Umoor Al-Amlaak (Trusts & Properties)":   "AML",
};

export const currentYear = new Date().getFullYear();
export const YEARS = Array.from(
  { length: currentYear - 2022 + 1 },
  function (_, i) { return 2022 + i; }
);

export const MUMIN_COLS = [
  "its_number","name","dob","age","gender",
  "phone","email","address","area_sector","sabil_no","status",
];

export const FILE_COLS = [
  "file_no","umoor_type","year","title","description","status","date",
];
