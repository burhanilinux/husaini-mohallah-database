import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";
import { sbGet } from "../lib/supabase.js";
import { getMuminAge } from "../lib/utils.js";
import { getExtendedProfile } from "../lib/muminProfile.js";
import { printMumin, printIdCard } from "../lib/print.js";
import { printMuminA4, printMuminFullProfile } from "../lib/muminA4Print.js";

export function MuminPreview() {
  var ctx = useAppContext();
  var muminPreview = ctx.muminPreview, setMuminPreview = ctx.setMuminPreview;
  var canEdit = ctx.canEdit, openModal = ctx.openModal;
  var setPage = ctx.setPage;
  var getFamilyBySabil = ctx.getFamilyBySabil, getSectorInfo = ctx.getSectorInfo;
  var [familyRecord, setFamilyRecord] = useState(null);
  var [showFullProfile, setShowFullProfile] = useState(false);

  useEffect(function () {
    var cancelled = false;
    setFamilyRecord(null);
    if (!muminPreview) return function () {};

    var familyId = muminPreview.family_id;
    var its = muminPreview.its_id || muminPreview.its_number;
    var hofId = muminPreview.source_data && muminPreview.source_data.HOF_ID;

    // Resolve the household from either Family ID or authoritative HOF_ID.
    // This keeps the 360 profile usable for legacy rows where one field is missing.
    var requests = [];
    if (familyId !== null && familyId !== undefined && String(familyId).trim() !== "") {
      requests.push(sbGet("families", "family_id=eq." + encodeURIComponent(familyId) + "&limit=1"));
    } else if (hofId) {
      requests.push(sbGet("families", "hof_its_id=eq." + encodeURIComponent(hofId) + "&limit=1"));
    } else if (its && muminPreview.source_data && String(muminPreview.source_data.HOF_FM_TYPE || "").toUpperCase() === "HOF") {
      requests.push(sbGet("families", "hof_its_id=eq." + encodeURIComponent(its) + "&limit=1"));
    }

    Promise.all(requests)
      .then(function (all) {
        if (!cancelled) {
          var rows = all.reduce(function (acc, part) { return acc.concat(part || []); }, []);
          setFamilyRecord(rows[0] || null);
        }
      })
      .catch(function () { if (!cancelled) setFamilyRecord(null); });

    return function () { cancelled = true; };
  }, [muminPreview]);

  useEffect(function () { setShowFullProfile(false); }, [muminPreview && muminPreview.id]);

  if (!muminPreview) return null;

  var m = muminPreview;
  var allMembers = (ctx.muminData || []).filter(function (o) { return !o.deleted_at; });
  var mIts = String(m.its_id || m.its_number || "").trim();
  var mHofId = String((m.source_data && m.source_data.HOF_ID) || "").trim();
  var mFamilyId = String(m.family_id || (familyRecord && familyRecord.family_id) || "").trim();

  // HOF_ID is authoritative for family membership. Family ID and Sabil remain
  // fallbacks for older/manual records that do not carry HOF_ID.
  var familyMembers = [];
  if (mHofId) {
    familyMembers = allMembers.filter(function (o) {
      var oHofId = String((o.source_data && o.source_data.HOF_ID) || "").trim();
      return oHofId === mHofId || String(o.its_id || o.its_number || "").trim() === mHofId;
    });
  }
  if (!familyMembers.length && mFamilyId) {
    familyMembers = allMembers.filter(function (o) { return String(o.family_id || "").trim() === mFamilyId; });
  }
  if (!familyMembers.length && m.sabil_no) {
    familyMembers = getFamilyBySabil(m.sabil_no);
  }
  if (mIts && !familyMembers.some(function (o) { return String(o.id) === String(m.id); })) familyMembers.unshift(m);

  var sabilFamily = familyMembers.filter(function (o) { return String(o.id) !== String(m.id); });
  var sectorInfo = getSectorInfo(m) || {};
  var familyHofIts = familyRecord && familyRecord.hof_its_id ? String(familyRecord.hof_its_id).trim() : mHofId;
  var hof = familyHofIts && ctx.getMuminByIts ? ctx.getMuminByIts(familyHofIts) : null;
  if (!hof && mIts && String((m.source_data && m.source_data.HOF_FM_TYPE) || "").toUpperCase() === "HOF") hof = m;
  var age = getMuminAge(m);
  var initials = (m.name || "?").trim().charAt(0).toUpperCase();
  var ext = getExtendedProfile(m);

  var warnings = [];
  if (!m.its_number) warnings.push("Missing ITS number");
  if (!m.name) warnings.push("Missing name");
  if (!m.phone) warnings.push("Missing phone number");
  if (!m.dob && !m.age) warnings.push("Missing date of birth / age");
  if (!m.area_sector) warnings.push("Area Sector not assigned");
  if (!m.family_id && !m.sabil_no) warnings.push("Family / Sabil not assigned");
  if (m.family_id && familyRecord && !familyRecord.hof_its_id) warnings.push("Family has no HOF assigned");
  if (m.sub_sector_id && !sectorInfo.subSectorName) warnings.push("Sub-Sector assignment is invalid");

  function close() { setMuminPreview(null); }
  function openSibling(member) { setMuminPreview(member); }

  return (
    <div className="preview-overlay" onClick={close}>
      <div className="preview-box" onClick={function (e) { e.stopPropagation(); }} style={{ maxWidth: 920, width: "min(920px, 96vw)" }}>
        <div className="preview-hdr">
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
            <div className="preview-avatar" style={{ width: 76, height: 76, flexShrink: 0, fontSize: 28 }}>
              {m.photo_url ? <img src={m.photo_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="preview-name" style={{ fontSize: 22 }}>{m.name || "Unnamed Mumin"}</div>
              <div style={{ fontSize: 10, color: "#c9a84c", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 3 }}>Mumin 360° Profile</div>
              <div className="preview-its">ITS: {m.its_number || "—"}{m.family_id ? "  •  Family: " + m.family_id : ""}</div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 7 }}>
                <span className={"badge badge-" + (m.status || "").toLowerCase()}>{m.status || "Status not set"}</span>
                {m.gender && <span className="badge">{m.gender}</span>}
                {age !== null && age !== undefined && <span className="badge">Age {age}</span>}
                {ext.dataVerificationStatus && <span className="badge" style={{ color: ext.isDataVerified ? "#34d399" : "#fbbf24" }}>Data: {ext.dataVerificationStatus}</span>}
                {ext.photoVerificationStatus && <span className="badge" style={{ color: ext.isPhotoVerified ? "#34d399" : "#fbbf24" }}>Photo: {ext.photoVerificationStatus}</span>}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={close}>×</button>
        </div>

        <div className="preview-body">
          {warnings.length > 0 && <div style={{ border: "1px solid #7c5a17", background: "rgba(124,90,23,.12)", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}><div style={{ fontWeight: 700, marginBottom: 5 }}>⚠ Data quality ({warnings.length})</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{warnings.map(function (w) { return <span key={w} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 14, background: "rgba(245,158,11,.12)" }}>{w}</span>; })}</div></div>}

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, .85fr)", gap: 14 }}>
            <div className="preview-section" style={{ margin: 0 }}><div className="preview-sec-title">Personal & Contact Details</div><div className="preview-grid">
              <div className="preview-field"><div className="preview-field-label">Age / DOB</div><div className="preview-field-val">{age || "—"}{m.dob ? " • " + m.dob : ""}</div></div>
              <div className="preview-field"><div className="preview-field-label">Gender</div><div className="preview-field-val">{m.gender || "—"}</div></div>
              <div className="preview-field"><div className="preview-field-label">Phone</div><div className="preview-field-val" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}><span>{m.phone || "—"}</span>{m.phone && <span style={{ display: "flex", gap: 6 }}><a href={"tel:" + m.phone.replace(/[^0-9+]/g, "")} className="quick-contact-btn quick-call" title="Call">📞</a><a href={"https://wa.me/" + m.phone.replace(/[^0-9]/g, "")} target="_blank" rel="noopener noreferrer" className="quick-contact-btn quick-wa" title="WhatsApp">💬</a></span>}</div></div>
              <div className="preview-field"><div className="preview-field-label">Email</div><div className="preview-field-val" style={{ fontSize: 12 }}>{m.email || "—"}</div></div>
              <div className="preview-field" style={{ gridColumn: "span 2" }}><div className="preview-field-label">Address</div><div className="preview-field-val">{m.address || "—"}{ext.city ? " • " + ext.city : ""}</div></div>
            </div></div>
            <div className="preview-section" style={{ margin: 0 }}><div className="preview-sec-title">Community Assignment</div><div className="preview-grid" style={{ gridTemplateColumns: "1fr" }}>
              <div className="preview-field"><div className="preview-field-label">Area Sector</div><div className="preview-field-val">{sectorInfo.sectorName || m.area_sector || "—"}</div></div>
              <div className="preview-field"><div className="preview-field-label">Masool</div><div className="preview-field-val">{sectorInfo.masoolName || "—"}</div></div>
              <div className="preview-field"><div className="preview-field-label">Sub-Sector</div><div className="preview-field-val">{sectorInfo.subSectorName || "—"}</div></div>
              <div className="preview-field"><div className="preview-field-label">Musaid</div><div className="preview-field-val">{sectorInfo.musaidName || "—"}</div></div>
              <div className="preview-field"><div className="preview-field-label">Sabil No.</div><div className="preview-field-val">{m.sabil_no || (familyRecord && familyRecord.sabil_no) || "—"}</div></div>
            </div></div>
          </div>

          <div className="preview-section"><div className="preview-sec-title">Family & HOF · 360° Household View</div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(120px,.6fr) minmax(180px,1fr) minmax(180px,1.4fr)", gap: 10, marginBottom: 10 }}>
              <div className="preview-field"><div className="preview-field-label">Family ID</div><div className="preview-field-val">{m.family_id || "—"}</div></div>
              <div className="preview-field"><div className="preview-field-label">Sabil No.</div><div className="preview-field-val">{(familyRecord && familyRecord.sabil_no) || m.sabil_no || "—"}</div></div>
              <div className="preview-field"><div className="preview-field-label">Head of Family</div><div className="preview-field-val">{hof ? hof.name + " • " + hof.its_number : (familyRecord && familyRecord.hof_its_id ? "ITS " + familyRecord.hof_its_id : "Not assigned")}</div></div>
            </div>
            {sabilFamily.length > 0 ? <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 7 }}>{sabilFamily.length} linked member{sabilFamily.length === 1 ? "" : "s"} · HOF relationship resolved from database linkage</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 7 }}>{sabilFamily.map(function (o) {
                var oIts = String(o.its_id || o.its_number || "").trim();
                var isHof = hof && String(hof.id) === String(o.id);
                return <div className="preview-family-chip" key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={function () { openSibling(o); }}><span>{isHof ? "👑 " : "🏠 "}{o.name}</span><span style={{ color: "#6b7280", fontSize: 11 }}>{oIts || "—"}</span></div>;
              })}</div>
            </div> : <div style={{ color: "#777", fontSize: 12 }}>No linked family members found.</div>}
          </div>

          {ext.hasSourceData && (
            <div className="preview-section">
              <div className="preview-sec-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={function () { setShowFullProfile(!showFullProfile); }}>
                <span>Full Profile {showFullProfile ? "▾" : "▸"}</span>
                {!showFullProfile && <span style={{ fontSize: 10, color: "#c9a84c", textTransform: "none", letterSpacing: 0 }}>Occupation, qualification, ziyarat, organisations & more</span>}
              </div>
              {showFullProfile && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    ["Occupation", ext.occupation], ["Sub-Occupation", ext.subOccupation], ["Qualification", ext.qualification],
                    ["Languages", ext.languages], ["Hunars", ext.hunars], ["Marital Status", ext.maritalStatus],
                    ["Blood Group", ext.bloodGroup], ["Misaq", ext.misaq], ["Vatan", ext.vatan],
                    ["Nationality", ext.nationality], ["WhatsApp", ext.whatsapp], ["Housing", ext.housing],
                    ["Type of House", ext.typeOfHouse], ["Quran Sanad", ext.quranSanad], ["Qadambosi Sharaf", ext.qadambosiSharaf],
                    ["Raudat Tahera Ziyarat", ext.raudatTaheraZiyarat], ["Karbala Ziyarat", ext.karbalaZiyarat], ["Ashara Mubaraka (times)", ext.asharaMubaraka],
                    ["Warakatul Tarkhis", ext.warakatulTarkhis], ["Organisation", ext.organisation], ["Last Scanned Event", ext.lastScannedEvent],
                    ["Last Scanned Place", ext.lastScannedPlace],
                  ].map(function (pair) {
                    return (
                      <div className="preview-field" key={pair[0]}>
                        <div className="preview-field-label">{pair[0]}</div>
                        <div className="preview-field-val" style={{ fontSize: 12 }}>{pair[1] || "—"}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {canEdit && <button className="btn btn-primary" onClick={function () { setMuminPreview(null); openModal("mumin", "edit", m); }}>✎ Edit Record</button>}
            <button className="btn btn-ghost" onClick={function () { printIdCard(m, sabilFamily, sectorInfo); }}>🪪 ID Card</button>
            <button className="btn btn-primary" onClick={function () { printMuminA4(m, familyRecord, familyMembers, sectorInfo); }}>🖨 Print A4</button>
            <button className="btn btn-ghost" onClick={function () { printMuminFullProfile(m, familyRecord, familyMembers, sectorInfo); }}>📋 Print Full Profile</button>
            {m.family_id && <button className="btn btn-ghost" onClick={function () { close(); setPage("families"); }}>🏠 Open Families</button>}
            <button className="btn btn-ghost" onClick={close}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
