import { createContext, useContext, useState, useEffect } from "react";
import {
  sbGet, sbInsert, sbUpdate, sbDelete, sbUpdateWhere, logActivity, uploadStorage,
  sbSignIn, sbSignOut, sbGetUser,
} from "../lib/supabase.js";
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
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState("admin"); // admin|editor|viewer

  var canEdit   = userRole === "admin" || userRole === "editor";
  var canDelete = userRole === "admin";
  var isAdmin   = userRole === "admin";

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
    return (session && session.user && session.user.email) || "Unknown";
  }

  // ── Report row builder (feeds print previews + Excel export) ──
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

      // Best-effort — these tables are supplementary (organisations,
      // memberships, import history) and shouldn't block core data loading
      // if one of them isn't set up yet (e.g. import_log migration not run).
      try {
        var extras = await Promise.all([
          sbGet("organisations", "order=name.asc"),
          sbGet("mumineen_organisations", "order=org_id.asc"),
          sbGet("import_log", "order=imported_at.desc&limit=100"),
        ]);
        setOrganisationsData(extras[0] || []);
        setMembershipsData(extras[1] || []);
        setImportLogData(extras[2] || []);
      } catch (_extraErr) {
        setOrganisationsData([]); setMembershipsData([]); setImportLogData([]);
      }
    } catch (e) {
      setDbError(e.message);
    }
    setLoading(false);
  }

  // ── Session bootstrap ──────────────────────────────────────────
  useEffect(function () {
    var stored = null;
    try { stored = localStorage.getItem("hm_session"); } catch (e) {}
    if (stored) {
      try {
        var s = JSON.parse(stored);
        sbGetUser(s.access_token).then(function (user) {
          if (user && user.id) {
            setSession(s);
            loadAll();
          } else {
            try { localStorage.removeItem("hm_session"); } catch (e) {}
          }
          setAuthLoading(false);
        }).catch(function () {
          try { localStorage.removeItem("hm_session"); } catch (e) {}
          setAuthLoading(false);
        });
      } catch (e) {
        try { localStorage.removeItem("hm_session"); } catch (e2) {}
        setAuthLoading(false);
      }
    } else {
      setAuthLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogin(data) {
    setSession(data);
    try { localStorage.setItem("hm_session", JSON.stringify(data)); } catch (e) {}
    loadAll();
  }

  function handleSignOut() {
    sbSignOut(session && session.access_token);
    setSession(null);
    setMuminData([]); setFilesData([]); setAttsData([]);
    try { localStorage.removeItem("hm_session"); } catch (e) {}
  }

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
        var path =
