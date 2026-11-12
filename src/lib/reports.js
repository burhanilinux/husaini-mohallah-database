import { sortFamilyMembers } from "./utils.js";
// ── Report row builders ──────────────────────────────────────────
// Each function takes whatever slice of app state it needs and returns
// { cols, rows, filename } — consumed by both the Reports page print
// view and the Excel (.xls) export button.

function ext(m) { return (m && m.source_data) || {}; }
function getVal(m, col, key) { return (m && (m[col] || ext(m)[key])) || ""; }
function getMuminAgeLocal(m, calcAge) {
  if (!m) return null;
  var fromDob = calcAge(m.dob);
  return fromDob !== null ? fromDob : (m.age === 0 || m.age ? Number(m.age) : null);
}

export function buildReportRows(reportId, extra, ctx) {
  var muminData = ctx.muminData || [];
  var filesData = ctx.filesData || [];
  var sectorsData = ctx.sectorsData || [];
  var activityLog = ctx.activityLog || [];
  var organisationsData = ctx.organisationsData || [];
  var membershipsData = ctx.membershipsData || [];
  var importLogData = ctx.importLogData || [];
  var areaSectors = ctx.areaSectors || [];
  var calcAge = ctx.calcAge;
  var getMuminByIts = ctx.getMuminByIts;
  var getSectorInfo = ctx.getSectorInfo;

  if (reportId === "mumin") {
    return {
      cols: ["its_number", "name", "age", "gender", "phone", "address", "area_sector", "masool", "sub_sector", "musaid", "status"],
      rows: muminData.map(function (m) {
        var si = getSectorInfo(m) || {};
        return {
          its_number: m.its_number || "", name: m.name || "", age: (getMuminAgeLocal(m, calcAge) == null ? "" : getMuminAgeLocal(m, calcAge)),
          gender: m.gender || "", phone: m.phone || "", address: m.address || "",
          area_sector: m.area_sector || "", masool: si.masoolName || "",
          sub_sector: si.subSectorName || "", musaid: si.musaidName || "",
          status: m.status || "",
        };
      }),
      filename: "mumin_directory",
    };
  }

  if (reportId === "files_all") {
    return {
      cols: ["file_no", "title", "umoor_type", "year", "status", "due_date"],
      rows: filesData.map(function (f) {
        return { file_no: f.file_no || "", title: f.title || "", umoor_type: f.umoor_type || "", year: f.year || "", status: f.status || "", due_date: f.due_date || "" };
      }),
      filename: "umoor_files_all",
    };
  }

  if (reportId === "reminders") {
    var withDue = filesData.filter(function (f) { return f.due_date; })
      .sort(function (a, b) { return new Date(a.due_date) - new Date(b.due_date); });
    return {
      cols: ["file_no", "title", "umoor_type", "status", "due_date"],
      rows: withDue.map(function (f) { return { file_no: f.file_no || "", title: f.title || "", umoor_type: f.umoor_type || "", status: f.status || "", due_date: f.due_date || "" }; }),
      filename: "reminders_report",
    };
  }

  if (reportId === "families") {
    var sabilGroups = {};
    muminData.forEach(function (m) {
      if (m.sabil_no && String(m.sabil_no).trim()) {
        var key = String(m.sabil_no).trim();
        if (!sabilGroups[key]) sabilGroups[key] = [];
        sabilGroups[key].push(m);
      }
    });
    var sabilKeys = Object.keys(sabilGroups).sort();
    return {
      cols: ["sabil_no", "members", "names"],
      rows: sabilKeys.map(function (k) {
        var grp = sortFamilyMembers(sabilGroups[k]);
        return { sabil_no: k, members: grp.length, names: grp.map(function (m) { return m.name; }).join(", ") };
      }),
      filename: "family_directory_by_sabil",
    };
  }

  if (reportId === "age_groups") {
    var groups = [
      { label: "Children (0-15)", min: 0, max: 15 },
      { label: "Youth (16-30)", min: 16, max: 30 },
      { label: "Adults (31-60)", min: 31, max: 60 },
      { label: "Seniors (61+)", min: 61, max: 999 },
    ];
    return {
      cols: ["age_group", "count", "male", "female", "percent"],
      rows: groups.map(function (g) {
        var mem = muminData.filter(function (m) { var a = getMuminAgeLocal(m, calcAge); return a !== null && a >= g.min && a <= g.max; });
        var male = mem.filter(function (m) { return m.gender === "Male"; }).length;
        var pct = muminData.length > 0 ? ((mem.length / muminData.length) * 100).toFixed(1) : 0;
        return { age_group: g.label, count: mem.length, male: male, female: mem.length - male, percent: pct + "%" };
      }),
      filename: "age_group_summary",
    };
  }

  if (reportId === "sector_summary") {
    var rows = areaSectors.map(function (s) {
      var mem = muminData.filter(function (m) { return m.area_sector === s; });
      var male = mem.filter(function (m) { return m.gender === "Male"; }).length;
      var pct = muminData.length > 0 ? ((mem.length / muminData.length) * 100).toFixed(1) : 0;
      var secObj = sectorsData.find(function (x) { return x.name === s; });
      var masoolLbl = secObj ? (secObj.masool_its ? (getMuminByIts(secObj.masool_its) ? getMuminByIts(secObj.masool_its).name : secObj.masool_its) : (secObj.masool_name || "")) : "";
      return { sector: s, masool: masoolLbl, count: mem.length, male: male, female: mem.length - male, percent: pct + "%" };
    });
    var noSector = muminData.filter(function (m) { return !m.area_sector || !m.area_sector.trim(); });
    if (noSector.length > 0) {
      var maleNS = noSector.filter(function (m) { return m.gender === "Male"; }).length;
      var pctNS = muminData.length > 0 ? ((noSector.length / muminData.length) * 100).toFixed(1) : 0;
      rows.push({ sector: "Not Assigned", masool: "", count: noSector.length, male: maleNS, female: noSector.length - maleNS, percent: pctNS + "%" });
    }
    return { cols: ["sector", "masool", "count", "male", "female", "percent"], rows: rows, filename: "sector_summary" };
  }

  if (reportId === "sector") {
    var sectorMembers = muminData.filter(function (m) { return m.area_sector === extra; });
    return {
      cols: ["its_number", "name", "age", "gender", "phone", "address", "sub_sector", "musaid", "status"],
      rows: sectorMembers.map(function (m) {
        var si = getSectorInfo(m) || {};
        return {
          its_number: m.its_number || "", name: m.name || "", age: (getMuminAgeLocal(m, calcAge) == null ? "" : getMuminAgeLocal(m, calcAge)),
          gender: m.gender || "", phone: m.phone || "", address: m.address || "",
          sub_sector: si.subSectorName || "", musaid: si.musaidName || "", status: m.status || "",
        };
      }),
      filename: "sector_" + (extra || "unknown").replace(/[^a-zA-Z0-9]/g, "_"),
    };
  }

  if (reportId === "umoor") {
    var umoorFiles = filesData.filter(function (f) { return f.umoor_type === extra; });
    return {
      cols: ["file_no", "title", "year", "date", "status", "due_date"],
      rows: umoorFiles.map(function (f) { return { file_no: f.file_no || "", title: f.title || "", year: f.year || "", date: f.date || "", status: f.status || "", due_date: f.due_date || "" }; }),
      filename: "umoor_" + (extra || "unknown").replace(/[^a-zA-Z0-9]/g, "_"),
    };
  }

  if (reportId === "masool_directory") {
    var msRows = [];
    sectorsData.forEach(function (sec) {
      var secMasoolName = sec.masool_its
        ? (getMuminByIts(sec.masool_its) ? getMuminByIts(sec.masool_its).name : sec.masool_its)
        : (sec.masool_name || "");
      var subs = ctx.getSubSectorsFor(sec.id);
      if (subs.length === 0) {
        msRows.push({ sector: sec.name, masool: secMasoolName, masool_phone: sec.masool_phone || "", sub_sector: "", musaid: "", musaid_phone: "" });
      } else {
        subs.forEach(function (sub) {
          var subMusaidName = sub.musaid_its
            ? (getMuminByIts(sub.musaid_its) ? getMuminByIts(sub.musaid_its).name : sub.musaid_its)
            : (sub.musaid_name || "");
          msRows.push({ sector: sec.name, masool: secMasoolName, masool_phone: sec.masool_phone || "", sub_sector: sub.name, musaid: subMusaidName, musaid_phone: sub.musaid_phone || "" });
        });
      }
    });
    return { cols: ["sector", "masool", "masool_phone", "sub_sector", "musaid", "musaid_phone"], rows: msRows, filename: "masool_directory" };
  }

  if (reportId === "occupation_directory") {
    var occMap = {};
    muminData.forEach(function (m) {
      var occ = getVal(m, "occupation", "Occupation").trim() || "Not Specified";
      if (!occMap[occ]) occMap[occ] = [];
      occMap[occ].push(m);
    });
    var occKeys = Object.keys(occMap).sort(function (a, b) { return occMap[b].length - occMap[a].length; });
    return {
      cols: ["occupation", "count", "members"],
      rows: occKeys.map(function (k) { return { occupation: k, count: occMap[k].length, members: occMap[k].map(function (m) { return m.name; }).join(", ") }; }),
      filename: "occupation_directory",
    };
  }

  if (reportId === "blood_group_directory") {
    var bgRows = muminData.filter(function (m) { return getVal(m, "blood_group", "Blood_Group").trim(); })
      .map(function (m) { return { blood_group: getVal(m, "blood_group", "Blood_Group"), its_number: m.its_number || "", name: m.name || "", phone: m.phone || "", sector: m.area_sector || "" }; })
      .sort(function (a, b) { return a.blood_group.localeCompare(b.blood_group); });
    return { cols: ["blood_group", "its_number", "name", "phone", "sector"], rows: bgRows, filename: "blood_group_emergency_directory" };
  }

  if (reportId === "verification_pending") {
    var vRows = muminData.map(function (m) {
      var dataStatus = getVal(m, "data_verification_status", "Data_Verifcation_Status") || "Unknown";
      var photoStatus = getVal(m, "photo_verification_status", "Photo_Verifcation_Status") || "Unknown";
      return { its_number: m.its_number || "", name: m.name || "", data_status: dataStatus, photo_status: photoStatus, sector: m.area_sector || "" };
    }).filter(function (r) {
      return r.data_status.toLowerCase().indexOf("not") === 0 || r.photo_status.toLowerCase().indexOf("not") === 0 || r.data_status === "Unknown" || r.photo_status === "Unknown";
    });
    return { cols: ["its_number", "name", "data_status", "photo_status", "sector"], rows: vRows, filename: "pending_verification" };
  }

  if (reportId === "city_distribution") {
    var cityMap = {};
    muminData.forEach(function (m) { var city = getVal(m, "city", "City").trim() || "Not Specified"; cityMap[city] = (cityMap[city] || 0) + 1; });
    var cityKeys = Object.keys(cityMap).sort(function (a, b) { return cityMap[b] - cityMap[a]; });
    return { cols: ["city", "count"], rows: cityKeys.map(function (k) { return { city: k, count: cityMap[k] }; }), filename: "city_distribution" };
  }

  if (reportId === "marital_status_summary") {
    var msMap = {};
    muminData.forEach(function (m) { var status = getVal(m, "marital_status", "Marital_Status").trim() || "Not Specified"; msMap[status] = (msMap[status] || 0) + 1; });
    return { cols: ["marital_status", "count"], rows: Object.keys(msMap).sort().map(function (k) { return { marital_status: k, count: msMap[k] }; }), filename: "marital_status_summary" };
  }

  if (reportId === "qualification_summary") {
    var qMap = {};
    muminData.forEach(function (m) { var q = getVal(m, "qualification", "Qualification").trim() || "Not Specified"; qMap[q] = (qMap[q] || 0) + 1; });
    var qKeys = Object.keys(qMap).sort(function (a, b) { return qMap[b] - qMap[a]; });
    return { cols: ["qualification", "count"], rows: qKeys.map(function (k) { return { qualification: k, count: qMap[k] }; }), filename: "qualification_summary" };
  }

  if (reportId === "organisation_directory") {
    var orgRows = [];
    organisationsData.forEach(function (org) {
      var members = membershipsData.filter(function (mo) { return Number(mo.org_id) === Number(org.org_id); });
      members.forEach(function (mo) {
        var person = muminData.find(function (m) { return Number(m.id) === Number(mo.mumin_id); });
        orgRows.push({ organisation: org.name, member: person ? person.name : "Unknown", its_number: person ? person.its_number : "", role: mo.role || "" });
      });
    });
    return { cols: ["organisation", "member", "its_number", "role"], rows: orgRows, filename: "organisation_directory" };
  }

  // ── Ashara Mubaraka attendance ─────────────────────────────────
  // ashara_mubaraka is a per-person integer count of how many times they've
  // attended, synced from the Jamaat export. Bucketed the same way age_groups
  // is, plus a "no data" bucket for records the field has never been set on
  // (distinct from a genuine 0 — someone eligible who simply hasn't attended).
  if (reportId === "ashara_mubaraka") {
    var abuckets = [
      { label: "No Data", test: function (v) { return v === null; } },
      { label: "Never Attended (0)", test: function (v) { return v === 0; } },
      { label: "1 – 5 times", test: function (v) { return v >= 1 && v <= 5; } },
      { label: "6 – 10 times", test: function (v) { return v >= 6 && v <= 10; } },
      { label: "11 – 20 times", test: function (v) { return v >= 11 && v <= 20; } },
      { label: "21+ times", test: function (v) { return v >= 21; } },
    ];
    function ashCount(m) {
      var raw = m.ashara_mubaraka !== undefined && m.ashara_mubaraka !== null ? m.ashara_mubaraka : ext(m).Ashara_Mubaraka;
      if (raw === null || raw === undefined || String(raw).trim() === "") return null;
      var n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    var counts = muminData.map(ashCount);
    var recorded = counts.filter(function (c) { return c !== null; });
    var totalAttendances = recorded.reduce(function (sum, c) { return sum + c; }, 0);
    var avg = recorded.length ? (totalAttendances / recorded.length).toFixed(1) : "0";

    var bucketRows = abuckets.map(function (b) {
      var mem = muminData.filter(function (m) { return b.test(ashCount(m)); });
      var pct = muminData.length ? ((mem.length / muminData.length) * 100).toFixed(1) : "0.0";
      return { attendance_range: b.label, count: mem.length, percent: pct + "%" };
    });
    bucketRows.push({ attendance_range: "TOTAL", count: muminData.length, percent: "100.0%" });
    bucketRows.push({ attendance_range: "Average (of members with data)", count: avg, percent: "" });

    return { cols: ["attendance_range", "count", "percent"], rows: bucketRows, filename: "ashara_mubaraka_attendance" };
  }

  if (reportId === "ashara_mubaraka_top") {
    function ashCount2(m) {
      var raw = m.ashara_mubaraka !== undefined && m.ashara_mubaraka !== null ? m.ashara_mubaraka : ext(m).Ashara_Mubaraka;
      if (raw === null || raw === undefined || String(raw).trim() === "") return null;
      var n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    var withCount = muminData.filter(function (m) { return ashCount2(m) !== null && ashCount2(m) > 0; })
      .sort(function (a, b) { return ashCount2(b) - ashCount2(a); });
    return {
      cols: ["its_number", "name", "sector", "times_attended"],
      rows: withCount.map(function (m) { return { its_number: m.its_number || "", name: m.name || "", sector: m.area_sector || "", times_attended: ashCount2(m) }; }),
      filename: "ashara_mubaraka_top_attendees",
    };
  }

  if (reportId === "import_history") {
    return {
      cols: ["imported_at", "file_name", "imported_by", "new_count", "updated_count", "unchanged_count", "conflict_count", "invalid_count"],
      rows: importLogData.map(function (l) {
        return {
          imported_at: l.imported_at ? new Date(l.imported_at).toLocaleString() : "",
          file_name: l.file_name || "", imported_by: l.imported_by || "",
          new_count: l.new_count || 0, updated_count: l.updated_count || 0,
          unchanged_count: l.unchanged_count || 0, conflict_count: l.conflict_count || 0, invalid_count: l.invalid_count || 0,
        };
      }),
      filename: "import_history",
    };
  }

  if (reportId === "activity_log") {
    return {
      cols: ["created_at", "user_email", "action", "entity_type", "entity_name"],
      rows: activityLog.map(function (a) {
        return { created_at: a.created_at ? new Date(a.created_at).toLocaleString() : "", user_email: a.user_email || "", action: a.action || "", entity_type: a.entity_type || "", entity_name: a.entity_name || "" };
      }),
      filename: "activity_log",
    };
  }

  return { cols: [], rows: [], filename: "report" };
}
