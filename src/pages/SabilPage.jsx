import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import { useState } from "react";
import { sbUpdate } from "../lib/supabase.js";

export function SabilPage() {
  var ctx = useAppContext();
  var loading = ctx.loading, sabilNos = ctx.sabilNos, getSabilMembers = ctx.getSabilMembers;
  var setSabilPreview = ctx.setSabilPreview;

  return (
    <div>
      <div className="page-hdr" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div className="page-title">Sabil Groups</div>
          <div className="page-sub">Members grouped by shared Sabil No.</div>
        </div>
      </div>
      {loading ? <div className="loading"><Spinner /> Loading…</div> : (
        <div>
          {sabilNos.length === 0 ? (
            <div className="card">
              <div className="empty" style={{ padding: 60 }}>
                <div className="empty-icon">🏠</div>
                <div>No Sabil No. assigned yet. Set a Sabil No. on a Mumin record to group them here.</div>
              </div>
            </div>
          ) : (
            <div className="fam-grid">
              {sabilNos.map(function (sn) {
                var members = getSabilMembers(sn);
                return (
                  <div className="fam-card" key={sn}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div className="fam-name">Sabil No. {sn}</div>
                        <div className="fam-meta">{members.length} member{members.length !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                    <div className="fam-members">
                      {members.slice(0, 4).map(function (mem) {
                        return (
                          <div className="fam-member-row" key={mem.id}>
                            <span className="fam-member-name">{mem.name}</span>
                            <span style={{ fontSize: 11, color: "#6b7280" }}>{mem.its_number}</span>
                          </div>
                        );
                      })}
                      {members.length > 4 && <div style={{ fontSize: 11, color: "#4b5563", paddingTop: 4 }}>+{members.length - 4} more…</div>}
                    </div>
                    <button
                      className="btn btn-ghost btn-sm" style={{ marginTop: 10, width: "100%" }}
                      onClick={function () { setSabilPreview(sn); }}
                    >
                      View All Members
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function relValue(m, keys) {
  for (var i = 0; i < keys.length; i++) {
    var v = m && m[keys[i]];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

function relHofId(m) {
  var direct = relValue(m, ["HOF_ID", "hof_id"]);
  if (direct) return String(direct).trim();
  var source = m && m.source_data;
  if (source && typeof source === "object") {
    var nested = relValue(source, ["HOF_ID", "hof_id"]);
    if (nested) return String(nested).trim();
  }
  return "";
}

export function RelationshipManagerPage() {
  var ctx = useAppContext();
  var data = (ctx.muminData || []).filter(function (m) { return !m.deleted_at; });
  var canEdit = !!ctx.canEdit;
  var [query, setQuery] = useState("");
  var [selectedHof, setSelectedHof] = useState(null);
  var [saving, setSaving] = useState(false);

  function its(m) { return String(relValue(m, ["its_number", "its_id", "its"])).trim(); }
  function name(m) { return relValue(m, ["name"]) || "Unnamed"; }

  var matches = data.filter(function (m) {
    var q = query.trim().toLowerCase();
    if (!q) return true;
    return [its(m), name(m), relHofId(m), relValue(m, ["sabil_no"])]
      .join(" ").toLowerCase().indexOf(q) >= 0;
  }).slice(0, 60);

  function household(hof) {
    var h = its(hof);
    return data.filter(function (m) { return relHofId(m) === h || its(m) === h; });
  }

  async function linkMember(member, hof) {
    if (!canEdit || !hof || saving) return;
    var oldSource = member.source_data && typeof member.source_data === "object" ? member.source_data : {};
    var nextSource = Object.assign({}, oldSource, { HOF_ID: its(hof) });
    setSaving(true);
    try {
      await sbUpdate("mumin_data", member.id, { source_data: nextSource });
      await ctx.loadAll();
      ctx.showToast("Family relationship updated");
    } catch (e) {
      ctx.showToast("Error updating relationship: " + e.message, "error");
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="page-hdr">
        <div>
          <div className="page-title">Family Relationship Manager</div>
          <div className="page-sub">Review HOF-linked households and correct family relationships.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Find a Mumin</div>
        <input className="input" value={query} onChange={function (e) { setQuery(e.target.value); }} placeholder="Search ITS, name, HOF ITS or Sabil No." />
        <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
          {matches.map(function (m) {
            return (
              <button key={m.id} className="btn btn-ghost" style={{ textAlign: "left", justifyContent: "space-between", display: "flex", width: "100%" }} onClick={function () {
                var h = relHofId(m);
                setSelectedHof(data.find(function (x) { return its(x) === h; }) || m);
              }}>
                <span><strong>{its(m)}</strong> · {name(m)}</span>
                <span className="muted">HOF: {relHofId(m) || "Not linked"}</span>
              </button>
            );
          })}
          {!matches.length && <div className="muted">No members found.</div>}
        </div>
      </div>

      {selectedHof && (
        <div className="card">
          <div className="section-title" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span>Household · HOF {its(selectedHof)}</span>
            <button className="btn btn-ghost" onClick={function () { ctx.setMuminPreview(selectedHof); }}>Open 360° Profile</button>
          </div>
          <div className="muted" style={{ marginBottom: 14 }}>HOF: <strong>{name(selectedHof)}</strong> · ITS {its(selectedHof)}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {household(selectedHof).map(function (m) {
              var isHof = its(m) === its(selectedHof);
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", border: "1px solid var(--border, #263241)", borderRadius: 10, flexWrap: "wrap" }}>
                  <div><strong>{name(m)}</strong><div className="muted">ITS {its(m)} {isHof ? "· HOF" : ""}</div></div>
                  <select className="input" style={{ width: 240, minWidth: 190 }} disabled={!canEdit || saving || isHof} value={isHof ? its(m) : (relHofId(m) || "")} onChange={function (e) { var h = data.find(function (x) { return its(x) === e.target.value; }); if (h) linkMember(m, h); }}>
                    {!isHof && <option value="">Not linked</option>}
                    {data.map(function (h) { return <option key={h.id} value={its(h)}>{its(h)} · {name(h)}</option>; })}
                  </select>
                </div>
              );
            })}
          </div>
          {!canEdit && <div className="muted" style={{ marginTop: 12 }}>Read-only access. Editor/admin access is required to change relationships.</div>}
        </div>
      )}
    </div>
  );
}
