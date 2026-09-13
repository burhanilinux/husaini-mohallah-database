import { analyzeMuminExcel } from "./excelMuminPreview.js";
import { syncMuminExcel } from "./excelMuminSync.js";

// The UI preview is helpful, but correctness must not depend on the UI state.
// Re-run the blocking checks immediately before any database writes.
export async function safeSyncMuminExcel(rows, existingRows, options) {
  var source = Array.isArray(rows) ? rows : [];
  var existing = Array.isArray(existingRows) ? existingRows : [];
  var opts = options || {};
  var analysis = analyzeMuminExcel(source, existing, opts.existingSectorNames || []);

  if (analysis.blocking) {
    var duplicateCount = (analysis.details.conflicts || []).filter(function (item) {
      return String(item.reason || "").indexOf("Duplicate ITS_ID") === 0;
    }).length;
    var invalidCount = analysis.counts.invalid || 0;
    var reasons = [];
    if (invalidCount) reasons.push(invalidCount + " invalid row(s)");
    if (duplicateCount) reasons.push(duplicateCount + " duplicate ITS_ID conflict(s)");
    throw new Error("Synchronization blocked: " + reasons.join(" and ") + ". Resolve the preview errors before importing.");
  }

  await syncMuminExcel(source, {
    fileName: opts.fileName || null,
    importedBy: opts.importedBy || null,
    analysisCounts: analysis.counts,
  }, opts.progress);

  return analysis;
}
