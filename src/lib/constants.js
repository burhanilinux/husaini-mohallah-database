// Legacy compatibility exports retained only so older backup/context code can load safely.
// Umoor features and records are no longer part of the application UI.
export const UMOOR_TYPES = [];
export const UMOOR_PREFIX = {};

export const currentYear = new Date().getFullYear();
export const YEARS = Array.from(
  { length: currentYear - 2022 + 1 },
  function (_, i) { return 2022 + i; }
);

export const MUMIN_COLS = [
  "its_number","name","dob","age","gender",
  "phone","email","address","area_sector","sabil_no","status",
];
