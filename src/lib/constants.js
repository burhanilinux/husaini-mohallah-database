export const currentYear = new Date().getFullYear();
export const YEARS = Array.from(
  { length: currentYear - 2022 + 1 },
  function (_, i) { return 2022 + i; }
);

export const MUMIN_COLS = [
  "its_number","name","dob","age","gender",
  "phone","email","address","area_sector","sabil_no","status",
];
