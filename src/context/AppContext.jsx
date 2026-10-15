import { createContext, useContext, useState, useEffect } from "react";
import {
  sbGet, sbInsert, sbUpdate, sbDelete, sbUpdateWhere, logActivity, uploadStorage,
} from "../lib/supabase.js";
import { useAuth } from "./AuthContext.jsx";
import { UMOOR_TYPES, currentYear } from "../lib/constants.js";
import { getUmoorPrefix, calcAge, downloadBlob, toXLS } from "../lib/utils.js";
import { validateMuminForm, validateFileForm, getMuminDuplicateWarnings } from "../lib/validation.js";
import { buildReportRows } from "../lib/reports.js";

const AppContext = createContext(null);

export function useAppContext() {
  var ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within <AppProvider>");
  return ctx;
}

export function AppProvider({ children }) {
  // ── Auth / session ──────────────────────────────────────────────
  // AppProvider is always rendered inside <AuthProvider> (see App.jsx), so
  // auth state lives in exactly one place: AuthContext. Previously this
  // component kept its own copies of session/authLoading/userRole and its
  // own localStorage bootstrap effect, which ran a second, independent
  // /auth/v1/user request on every load and could disagree with
  // AuthContext (it defaulted to "admin" instead of failing closed to
  // "viewer"). Read everything from useAuth() instead.
  var auth = useAuth();
  var session = auth.session;
  var authLoading = auth.authLoading;
  var userRole = auth.userRole; // admin|editor|viewer
  var canEdit = auth.canEdit;
  var canDelete = auth.canDelete;
  var isAdmin = auth.isAdmin;

  // ── Navigation ────────────────────────────────────────────────
  const [page, setPage] = useState("dashboard");

  // ── Core data ─────────────────────────────────────────────────
  const [muminData, setMuminData] = useState([]);
  const [filesData, setFilesData] = useState([]);
  const [attsData, setAttsData] = useState([]);
  const [sectorsData, setSectorsData] = useState([]);
  const [subSectorsData, setSubSectorsData] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [usersData, setUsersData] = useState([]);
  // Backing data for the Reports page (Organisation Directory, Import
  // History) — previously never fetched, so those reports always showed
  // empty even though the report builder in lib/reports.js expects them.
  const [organisationsData, setOrganisationsData] = useState([]);
  const [membershipsData, setMembershipsData] = useState([]);
  const [importLogData, setImportLogData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(null);

  // ── Filters / selections ─────────────────────────────────────
  const [selYear, setSelYear] = useState(2026);
  const [selUmoor, setSelUmoor] = useState(null);
  const [selSector, setSelSector] = useState(null);
  const [search, setSearch] = useState("");
  const [expandedSector, setExpandedSector] = useState(null);
  const [sabilPreview, setSabilPreview] = useState(null);
  const [gSearch, setGSearch] = useState("");
  const [gSearchOpen, setGSearchOpen] = useState(false);

  // ── Mumin / File modal & form ─────────────────────────────────
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [formAtts, setFormAtts] = useState([]);
  const [formErrors, setFormErrors] = useState([]);
  const [formWarnings, setFormWarnings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [muminPhotoFile, setMuminPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Sector / Sub-Sector (Masool) modal & form ────────────────
  const [sectorModal, setSectorModal] = useState(null);
  const [sectorForm, setSectorForm] = useState({});
  const [subSectorModal, setSubSectorModal] = useState(null);
  const [subSectorForm, setSubSectorForm] = useState({});

  // ── Previews / misc UI ────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [muminPreview, setMuminPreview] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);

  // ── Import / Export ───────────────────────────────────────────
  const [ieModal, setIeModal] = useState(false);
  const [importing, setImporting] = useState(false);

  // ── Trash ──────────────────────────────────────────────────────
  const [trashModal, setTrashModal] = useState(false);
  const [trashMumin, setTrashMumin] = useState([]);
  const [trashFiles, setTrashFiles] = useState([]);
  const [restoring, setRestoring] = useState(false);

  // ── Toast helper ──────────────────────────────────────────────
  function showToast(msg, type) {
    setToast({ msg: msg, type: type || "success" });
    setTimeout(function () { setToast(null); }, 3500);
  }

  function getUserEmail() {
    return (auth.user && auth.user.email) || "Unknown";
  }

  // ── Report row builder (feeds print previews + Excel export) ──
  // Delegates to the shared builder in lib/reports.js, which supports
  // every report id ReportsPage.jsx lists (occupation, blood group,
  // verification, city, marital status, qualification, organisation,
  // Ashara Mubaraka, import history, ...). The previous inline version
  // here only understood a handful of legacy report ids, so "XLS" export
  // silently produced "No data to export" for most of the reports page.
  function getReportRows(reportId, extra) {
    return buildReportRows(reportId, extra, {
      muminData, filesData, sectorsData, activityLog,
      organisationsData, membershipsData, importLogData,
      areaSectors, calcAge, getMuminByIts, getSectorInfo, getSubSectorsFor,
    });
  }

  function exportReportXLS(reportId, extra) {
    var r = getReportRows(reportId, extra);
    if (r.rows.length === 0) { showToast("No data to export", "error"); return; }
    toXLS(r.rows, r.cols, r.filename);
    showToast("Excel file downloaded — " + r.filename + ".xls");
  }

  // ── Masool / Sector lookups ───────────────────────────────────
  function getSubSectorsFor(sectorId) {
    return subSectorsData.filter(function (s) { return s.sector_id === sectorId; });
  }
  function getMuminByIts(its) {
    return muminData.find(function (m) { return m.its_number === its; });
  }
  function getSectorInfo(m) {
    if (!m) return null;
    var sector = sectorsData.find(function (s) { return s.name === m.area_sector; });
    var subSector = m.sub_sector_id ? subSectorsData.find(function (s) { return s.id === m.sub_sector_id; }) : null;
    var masoolLabel = sector ? (sector.masool_its ? (getMuminByIts(sector.masool_its) ? getMuminByIts(sector.masool_its).name : sector.masool_its) : (sector.masool_name || "")) : "";
    var musaidLabel = subSector ? (subSector.musaid_its ? (getMuminByIts(subSector.musaid_its) ? getMuminByIts(subSector.musaid_its).name : subSector.musaid_its) : (subSector.musaid_name || "")) : "";
    return {
      sectorName: m.area_sector || "",
      masoolName: masoolLabel,
      subSectorName: subSector ? subSector.name : "",
      musaidName: musaidLabel,
    };
  }
  function getMuminCountForSector(sectorName) {
    return muminData.filter(function (m) { return m.area_sector === sectorName; }).length;
  }
  function getFamilyBySabil(sabilNo) {
    if (!sabilNo || !String(sabilNo).trim()) return [];
    return muminData.filter(function (m) { return m.sabil_no && String(m.sabil_no).trim() === String(sabilNo).trim(); });
  }
  function getMuminCountForSubSector(subSectorId) {
    return muminData.filter(function (m) { return m.sub_sector_id === subSectorId; }).length;
  }
  function getSabilMembers(sabilNo) {
    return muminData.filter(function (m) { return m.sabil_no && String(m.sabil_no).trim() === String(sabilNo).trim(); });
  }

  // ── Sector (Masool) CRUD ──────────────────────────────────────
  function openSectorModal(mode, record) {
    setSectorForm(record ? Object.assign({}, record) : { name: "" });
    setSectorModal({ mode: mode, record: record || null });
  }
  function closeSectorModal() { setSectorModal(null); setSectorForm({}); }

  async function saveSector() {
    if (!sectorForm.name || !sectorForm.name.trim()) { showToast("Sector name is required", "error"); return; }
    setSaving(true);
    try {
      var payload = {
        name: sectorForm.name.trim(),
        masool_its: sectorForm.masool_its || null,
        masool_name: sectorForm.masool_name || "",
        masool_phone: sectorForm.masool_phone || "",
      };
      if (sectorModal.mode === "add") await sbInsert("sectors", payload);
      else await sbUpdate("sectors", sectorForm.id, payload);
      await logActivity(sectorModal.mode === "add" ? "create" : "update", "sector", payload.name, getUserEmail());
      showToast(sectorModal.mode === "add" ? "Sector created" : "Sector updated");
      await loadAll(); closeSectorModal();
    } catch (e) { showToast("Error: " + e.message, "error"); }
    setSaving(false);
  }

  async function deleteSector(sec) {
    var subs = getSubSectorsFor(sec.id);
    var subIds = subs.map(function (s) { return s.id; });
    var affectedCount = muminData.filter(function (m) {
      return m.sub_sector_id && subIds.indexOf(m.sub_sector_id) >= 0;
    }).length;

    var msg = "Delete sector \"" + sec.name + "\"? This will also delete its " + subs.length + " sub-sector(s). Mumin records keep their sector name as text.";
    if (affectedCount > 0) {
      msg += "\n\n⚠ " + affectedCount + " member(s) are currently assigned to a sub-sector under this sector — their sub-sector assignment will be cleared.";
    }
    if (!window.confirm(msg)) return;

    try {
      if (affectedCount > 0 && subIds.length > 0) {
        var filter = "sub_sector_id=in.(" + subIds.join(",") + ")";
        await sbUpdateWhere("mumin_data", filter, { sub_sector_id: null });
      }
      for (var i = 0; i < subs.length; i++) await sbDelete("sub_sectors", subs[i].id);
      await sbDelete("sectors", sec.id);
      await logActivity("delete", "sector", sec.name, getUserEmail());
      showToast(affectedCount > 0 ? "Sector deleted, " + affectedCount + " member assignment(s) cleared" : "Sector deleted");
      await loadAll();
    } catch (e) { showToast("Error: " + e.message, "error"); }
  }

  // ── Sub-Sector (Musaid) CRUD ──────────────────────────────────
  function openSubSectorModal(mode, sectorId, record) {
    setSubSectorForm(record ? Object.assign({}, record) : { sector_id: sectorId, name: "" });
    setSubSectorModal({ mode: mode, sectorId: sectorId, record: record || null });
  }
  function closeSubSectorModal() { setSubSectorModal(null); setSubSectorForm({}); }

  async function saveSubSector() {
    if (!subSectorForm.name || !subSectorForm.name.trim()) { showToast("Sub-Sector name is required", "error"); return; }
    setSaving(true);
    try {
      var payload = {
        sector_id: subSectorForm.sector_id,
        name: subSectorForm.name.trim(),
        musaid_its: subSectorForm.musaid_its || null,
        musaid_name: subSectorForm.musaid_name || "",
        musaid_phone: subSectorForm.musaid_phone || "",
      };
      if (subSectorModal.mode === "add") await sbInsert("sub_sectors", payload);
      else await sbUpdate("sub_sectors", subSectorForm.id, payload);
      await logActivity(subSectorModal.mode === "add" ? "create" : "update", "sub_sector", payload.name, getUserEmail());
      showToast(subSectorModal.mode === "add" ? "Sub-Sector created" : "Sub-Sector updated");
      await loadAll(); closeSubSectorModal();
    } catch (e) { showToast("Error: " + e.message, "error"); }
    setSaving(false);
  }

  async function deleteSubSector(sub) {
    var affectedCount = getMuminCountForSubSector(sub.id);
    var msg = "Delete sub-sector \"" + sub.name + "\"?";
    if (affectedCount > 0) {
      msg += "\n\n⚠ " + affectedCount + " member(s) are currently assigned to this sub-sector — their sub-sector assignment will be cleared.";
    }
    if (!window.confirm(msg)) return;

    try {
      if (affectedCount > 0) {
        await sbUpdateWhere("mumin_data", "sub_sector_id=eq." + sub.id, { sub_sector_id: null });
      }
      await sbDelete("sub_sectors", sub.id);
      await logActivity("delete", "sub_sector", sub.name, getUserEmail());
      showToast(affectedCount > 0 ? "Sub-Sector deleted, " + affectedCount + " member assignment(s) cleared" : "Sub-Sector deleted");
      await loadAll();
    } catch (e) { showToast("Error: " + e.message, "error"); }
  }

  // ── Trash ──────────────────────────────────────────────────────
  async function loadTrash() {
    try {
      var results = await Promise.all([
        sbGet("mumin_data", "deleted_at=not.is.null&order=deleted_at.desc"),
        sbGet("umoor_files", "deleted_at=not.is.null&order=deleted_at.desc"),
      ]);
      setTrashMumin(results[0] || []);
      setTrashFiles(results[1] || []);
    } catch (e) { showToast("Error loading trash: " + e.message, "error"); }
  }
  async function restoreRecord(type, rec) {
    setRestoring(true);
    try {
      await sbUpdate(type === "mumin" ? "mumin_data" : "umoor_files", rec.id, { deleted_at: null });
      await logActivity("restore", type, rec.name || rec.title || ("#" + rec.id), getUserEmail());
      showToast("Restored successfully");
      await loadAll(); await loadTrash();
    } catch (e) { showToast("Error: " + e.message, "error"); }
    setRestoring(false);
  }
  async function permanentDelete(type, rec) {
    if (!window.confirm("Permanently delete this record? This cannot be undone.")) return;
    setRestoring(true);
    try {
      await sbDelete(type === "mumin" ? "mumin_data" : "umoor_files", rec.id);
      await logActivity("permanent_delete", type, rec.name || rec.title || ("#" + rec.id), getUserEmail());
      showToast("Permanently deleted");
      await loadTrash();
    } catch (e) { showToast("Error: " + e.message, "error"); }
    setRestoring(false);
  }

  // ── Backup / Restore ───────────────────────────────────────────
  function downloadFullBackup() {
    var backup = {
      backup_date: new Date().toISOString(),
      mumin_data: muminData,
      umoor_files: filesData,
      attachments: attsData,
      sectors: sectorsData,
      sub_sectors: subSectorsData,
    };
    var json = JSON.stringify(backup, null, 2);
    var fname = "husaini-mohallah-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    downloadBlob(json, fname, "application/json");
    logActivity("backup", "system", "Full data backup", getUserEmail());
    showToast("Backup downloaded — " + muminData.length + " members, " + filesData.length + " files");
  }

  async function restoreFromBackup(file) {
    var reader = new FileReader();
    reader.onload = async function (e) {
      try {
        var backup = JSON.parse(e.target.result);
        if (!backup.mumin_data && !backup.umoor_files) {
          showToast("Invalid backup file format", "error"); return;
        }
        if (!window.confirm("This will ADD all records from the backup as new entries. Continue?")) return;
        setRestoring(true);
        var addedMumin = 0, addedFiles = 0;
        if (backup.mumin_data) {
          for (var i = 0; i < backup.mumin_data.length; i++) {
            var m = backup.mumin_data[i];
            try {
              await sbInsert("mumin_data", {
                its_number: m.its_number || "", name: m.name || "", dob: m.dob || null,
                age: m.age || null, gender: m.gender || "Male", phone: m.phone || "",
                email: m.email || "", address: m.address || "", status: m.status || "Active",
                photo_url: m.photo_url || null,
              });
              addedMumin++;
            } catch (err) {}
          }
        }
        if (backup.umoor_files) {
          for (var j = 0; j < backup.umoor_files.length; j++) {
            var f = backup.umoor_files[j];
            try {
              await sbInsert("umoor_files", {
                file_no: f.file_no || "", umoor_type: f.umoor_type || "", year: f.year || currentYear,
                title: f.title || "", description: f.description || "", status: f.status || "Active",
                date: f.date || "", due_date: f.due_date || null,
              });
              addedFiles++;
            } catch (err) {}
          }
        }
        await logActivity("restore_backup", "system", addedMumin + " members, " + addedFiles + " files", getUserEmail());
        showToast("Restored " + addedMumin + " members and " + addedFiles + " files");
        await loadAll();
      } catch (err) {
        showToast("Error reading backup file: " + err.message, "error");
      }
      setRestoring(false);
    };
    reader.readAsText(file);
  }

  // ── Load everything from Supabase ─────────────────────────────
  async function loadAll() {
    setLoading(true); setDbError(null);
    try {
      var results = await Promise.all([
        sbGet("mumin_data", "order=id.asc"),
        sbGet("umoor_files", "order=id.desc"),
        sbGet("attachments", "order=id.asc"),
        sbGet("activity_log", "order=id.desc&limit=200"),
        sbGet("sectors", "order=name.asc"),
        sbGet("sub_sectors", "order=name.asc"),
      ]);
      setMuminData((results[0] || []).filter(function (m) { return !m.deleted_at; }));
      setFilesData((results[1] || []).filter(function (f) { return !f.deleted_at; }));
      setAttsData(results[2] || []);
      setActivityLog(results[3] || []);
      setSectorsData(results[4] || []);
      setSubSectorsData(results[5] || []);
    } catch (e) {
      setDbError(e.message);
    }
    setLoading(false);

    // Reports-page-only reference data. Kept out of the Promise.all above and
    // failed independently: these tables/columns have drifted from what the
    // migration files describe (see 20260911_extend_mumineen_schema.sql's
    // CREATE TABLE IF NOT EXISTS comment), so a missing/renamed column here
    // must never take down mumin_data, sectors, etc. Each report reads these
    // with `|| []` defaults, so an empty result just means that one report
    // (Organisation Directory / Import History) shows no data instead of
    // the whole app failing to load.
    try {
      var refResults = await Promise.all([
        sbGet("organisations", ""),
        sbGet("mumineen_organisations", ""),
        sbGet("import_log", "order=imported_at.desc&limit=200"),
      ]);
      setOrganisationsData(refResults[0] || []);
      setMembershipsData(refResults[1] || []);
      setImportLogData(refResults[2] || []);
    } catch (e) {
      console.warn("Organisation/import-log reference data failed to load (non-fatal):", e.message);
    }
  }

  // Kick off the initial load once auth has resolved to a signed-in session.
  // (Auth bootstrap itself — reading localStorage, validating the token —
  // lives entirely in AuthContext now; this just reacts to its result.)
  useEffect(function () {
    if (session) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ── Mumin / File modal helpers ─────────────────────────────────
  function getFileAtts(fileId) {
    return attsData.filter(function (a) { return a.file_id === fileId; });
  }

  function openModal(type, mode, record) {
    setForm(record ? Object.assign({}, record) : { year: selYear, status: "Active" });
    setFormAtts(type === "file" && record ? getFileAtts(record.id) : []);
    setMuminPhotoFile(null);
    setFormErrors([]);
    setFormWarnings([]);
    setModal({ type: type, mode: mode, record: record || null });
  }
  function closeModal() {
    setModal(null); setForm({}); setFormAtts([]);
    setMuminPhotoFile(null); setFormErrors([]); setFormWarnings([]);
  }

  async function saveMumin(confirmed) {
    var errors = validateMuminForm(form, muminData, modal.mode === "edit" ? form.id : null);
    if (errors.length > 0) { setFormErrors(errors); setFormWarnings([]); return; }
    setFormErrors([]);

    if (!confirmed) {
      var warnings = getMuminDuplicateWarnings(form, muminData, modal.mode === "edit" ? form.id : null);
      if (warnings.length > 0) { setFormWarnings(warnings); return; }
    }
    setFormWarnings([]);

    setSaving(true);
    try {
      var photoUrl = form.photo_url || null;
      if (muminPhotoFile) {
        setUploadingPhoto(true);
        var path = "mumin-photos/" + Date.now() + "-" + muminPhotoFile.name.replace(/[^a-zA-Z0-9.]/g, "_");
        photoUrl = await uploadStorage(muminPhotoFile, path);
        setUploadingPhoto(false);
      }
      var itsNumber = (form.its_number || "").trim();
      var itsId = itsNumber && /^\d+$/.test(itsNumber) ? Number(itsNumber) : null;
      if (itsNumber && itsId === null) throw new Error("ITS Number must contain digits only.");
      // ITS IDs are referenced by family and spouse relationships. Do not
      // silently change an existing identity here; that requires a dedicated
      // relationship-aware migration rather than a normal profile edit.
      if (modal.mode === "edit" && String(itsNumber) !== String((modal.record && modal.record.its_number) || "")) {
        throw new Error("ITS Number changes require a relationship-aware migration. Keep the existing ITS Number for this edit.");
      }
      var payload = {
        its_id: itsId,
        its_number: itsNumber,
        name: form.name.trim(),
        dob: form.dob || null,
        age: form.dob ? calcAge(form.dob) : (form.age ? Number(form.age) : null),
        gender: form.gender || "Male",
        phone: form.phone || "",
        email: form.email || "",
        address: form.address || "",
        area_sector: form.area_sector || "",
        sabil_no: form.sabil_no || "",
        sub_sector_id: form.sub_sector_id || null,
        status: form.status || "Active",
        photo_url: photoUrl,
      };
      if (modal.mode === "add") await sbInsert("mumin_data", payload);
      else await sbUpdate("mumin_data", form.id, payload);
      await logActivity(modal.mode === "add" ? "create" : "update", "mumin", payload.name, getUserEmail());
      showToast(modal.mode === "add" ? "Mumin record saved ☁" : "Record updated");
      await loadAll(); closeModal();
    } catch (e) { showToast("Error: " + e.message, "error"); }
    setSaving(false); setUploadingPhoto(false);
  }

  async function saveFile() {
    var errors = validateFileForm(form);
    if (errors.length > 0) { setFormErrors(errors); return; }
    setFormErrors([]);
    setSaving(true);
    try {
      var fileNo = form.file_no || ("HM-" + getUmoorPrefix(form.umoor_type || "") + "-" + form.year + "-" + String(Date.now()).slice(-3));
      var payload = {
        file_no: fileNo,
        umoor_type: form.umoor_type || "",
        year: Number(form.year) || 2026,
        title: form.title.trim(),
        description: form.description || "",
        status: form.status || "Active",
        date: form.date || "",
        due_date: form.due_date || null,
      };
      var fileId;
      if (modal.mode === "add") {
        var result = await sbInsert("umoor_files", payload);
        fileId = Array.isArray(result) ? result[0].id : result.id;
      } else {
        fileId = form.id;
        await sbUpdate("umoor_files", fileId, payload);
        var existingIds = attsData.filter(function (a) { return a.file_id === fileId; }).map(function (a) { return a.id; });
        var keptIds = formAtts.filter(function (a) { return a.id; }).map(function (a) { return a.id; });
        for (var i = 0; i < existingIds.length; i++) {
          if (keptIds.indexOf(existingIds[i]) < 0) await sbDelete("attachments", existingIds[i]);
        }
      }
      var newAtts = formAtts.filter(function (a) { return !a.id; });
      if (newAtts.length > 0) {
        setUploading(true);
        for (var j = 0; j < newAtts.length; j++) {
          var att = newAtts[j];
          var ext = att.name.split(".").pop();
          var path = "files/" + fileId + "/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;
          var url = await uploadStorage(att, path);
          await sbInsert("attachments", { file_id: fileId, name: att.name, size: att.size, type: att.type, url: url });
        }
        setUploading(false);
      }
      await logActivity(modal.mode === "add" ? "create" : "update", "file", payload.title, getUserEmail());
      showToast(modal.mode === "add" ? "File saved ☁" : "File updated");
      await loadAll(); closeModal();
    } catch (e) { showToast("Error: " + e.message, "error"); setUploading(false); }
    setSaving(false);
  }

  async function deleteRecord(type, id) {
    try {
      var table = type === "mumin" ? "mumin_data" : "umoor_files";
      var list  = type === "mumin" ? muminData : filesData;
      var rec   = list.find(function (r) { return r.id === id; });
      var name  = rec ? (rec.name || rec.title || ("#" + id)) : ("#" + id);
      await sbUpdate(table, id, { deleted_at: new Date().toISOString() });
      await logActivity("delete", type, name, getUserEmail());
      showToast("Moved to Trash"); await loadAll();
    } catch (e) { showToast("Error: " + e.message, "error"); }
  }

  // ── Import handlers ────────────────────────────────────────────
  async function handleImportMumin(rows) {
    setImporting(true);
    var ok = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      try {
        var itsNumber = String(r.its_number || "").trim();
        var itsId = itsNumber && /^\d+$/.test(itsNumber) ? Number(itsNumber) : null;
        if (itsNumber && itsId === null) throw new Error("ITS Number must contain digits only.");
        await sbInsert("mumin_data", {
          its_id: itsId, its_number: itsNumber, name: r.name || "",
          dob: r.dob || null, age: r.dob ? calcAge(r.dob) : (r.age ? Number(r.age) : null), gender: r.gender || "Male",
          phone: r.phone || "", email: r.email || "",
          address: r.address || "", area_sector: r.area_sector || "", sabil_no: r.sabil_no || "", status: r.status || "Active",
        });
        ok++;
      } catch (e) {}
    }
    await loadAll(); setImporting(false); setIeModal(false);
    showToast("Imported " + ok + " of " + rows.length + " records ☁");
  }

  async function handleImportFiles(rows) {
    setImporting(true);
    var ok = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      try {
        await sbInsert("umoor_files", {
          file_no: r.file_no || ("HM-" + getUmoorPrefix(r.umoor_type || "") + "-" + r.year + "-" + String(Date.now()).slice(-3)),
          umoor_type: r.umoor_type || "", year: Number(r.year) || 2026,
          title: r.title || "", description: r.description || "",
          status: r.status || "Active", date: r.date || "",
        });
        ok++;
      } catch (e) {}
    }
    await loadAll(); setImporting(false); setIeModal(false);
    showToast("Imported " + ok + " of " + rows.length + " records ☁");
  }

  // ── Derived / computed values ──────────────────────────────────
  var areaSectors = (function () {
    var set = {};
    muminData.forEach(function (m) { if (m.area_sector && m.area_sector.trim()) set[m.area_sector.trim()] = true; });
    return Object.keys(set).sort();
  })();

  var sabilNos = (function () {
    var set = {};
    muminData.forEach(function (m) { if (m.sabil_no && String(m.sabil_no).trim()) set[String(m.sabil_no).trim()] = true; });
    return Object.keys(set).sort();
  })();

  var filteredMumin = muminData.filter(function (m) {
    var matchesSearch = (m.name || "").toLowerCase().indexOf(search.toLowerCase()) >= 0
      || (m.its_number || "").indexOf(search) >= 0;
    var matchesSector = selSector ? m.area_sector === selSector : true;
    return matchesSearch && matchesSector;
  });

  var filteredFiles = filesData.filter(function (f) {
    return (selYear ? f.year === selYear : true)
      && (selUmoor ? f.umoor_type === selUmoor : true)
      && (search ? (f.title || "").toLowerCase().indexOf(search.toLowerCase()) >= 0
          || (f.file_no || "").indexOf(search) >= 0 : true);
  });

  var umoorStats = UMOOR_TYPES.map(function (u, i) {
    return {
      name: u, num: i + 1,
      count: filesData.filter(function (f) { return f.umoor_type === u && f.year === selYear; }).length,
    };
  });

  // ── Context value ───────────────────────────────────────────────
  var value = {
    // auth — sourced from AuthContext, exposed here so existing consumers
    // (Sidebar, etc.) that read ctx.session / ctx.handleSignOut keep working.
    // Prefer useAuth() directly in new code.
    session, authLoading, userRole, canEdit, canDelete, isAdmin,
    handleSignOut: auth.logout,
    // nav
    page, setPage,
    // data
    muminData, filesData, attsData, sectorsData, subSectorsData, activityLog,
    organisationsData, membershipsData, importLogData,
    usersData, setUsersData, loading, dbError, loadAll,
    // filters
    selYear, setSelYear, selUmoor, setSelUmoor, selSector, setSelSector,
    search, setSearch, expandedSector, setExpandedSector,
    sabilPreview, setSabilPreview, gSearch, setGSearch, gSearchOpen, setGSearchOpen,
    // mumin/file modal
    modal, setModal, form, setForm, formAtts, setFormAtts, formErrors, setFormErrors,
    formWarnings, setFormWarnings,
    saving, uploading, muminPhotoFile, setMuminPhotoFile, uploadingPhoto,
    openModal, closeModal, saveMumin, saveFile, deleteRecord, getFileAtts,
    // sector/subsector (masool)
    sectorModal, sectorForm, setSectorForm, subSectorModal, subSectorForm, setSubSectorForm,
    openSectorModal, closeSectorModal, saveSector, deleteSector,
    openSubSectorModal, closeSubSectorModal, saveSubSector, deleteSubSector,
    getSubSectorsFor, getMuminByIts, getSectorInfo,
    getMuminCountForSector, getMuminCountForSubSector, getFamilyBySabil, getSabilMembers,
    // ui
    toast, showToast, lightbox, setLightbox,
    muminPreview, setMuminPreview, filePreview, setFilePreview,
    printTarget, setPrintTarget,
    // import/export
    ieModal, setIeModal, importing, handleImportMumin, handleImportFiles,
    getReportRows, exportReportXLS,
    // trash
    trashModal, setTrashModal, trashMumin, trashFiles, restoring,
    loadTrash, restoreRecord, permanentDelete,
    // backup
    downloadFullBackup, restoreFromBackup,
    // computed
    areaSectors, sabilNos, filteredMumin, filteredFiles, umoorStats,
    getUserEmail,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
