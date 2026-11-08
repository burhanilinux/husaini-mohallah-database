import { useMemo, useState } from "react";
import { useAppContext as useApp } from "../context/AppContext.jsx";

function norm(v) { return String(v ?? "").trim().toLowerCase(); }
function label(v) { return v == null || v === "" ? "—" : String(v); }

export default function RelationshipIntelligencePage() {
  const ctx = useApp();
  const data = Array.isArray(ctx.muminData) ? ctx.muminData : [];
  const [query, setQuery] = useState("");
  const [familyOnly, setFamilyOnly] = useState(true);

  const families = useMemo(() => {
    const map = new Map();
    data.forEach(m => {
      const key = String(m.family_id ?? m.sabil_no ?? "").trim();
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    });
    return [...map.entries()].sort((a,b) => a[0].localeCompare(b[0], undefined, {numeric:true}));
  }, [data]);

  const results = useMemo(() => {
    const q = norm(query);
    return families.filter(([key, members]) => {
      if (!q) return true;
      return key.toLowerCase().includes(q) || members.some(m =>
        [m.name, m.its_number, m.sabil_no, m.area_sector].some(v => norm(v).includes(q))
      );
    });
  }, [families, query]);

  function openMumin(m) {
    if (ctx.setMuminPreview) ctx.setMuminPreview(m);
    else if (ctx.openModal) ctx.openModal("muminPreview", m);
  }

  return <div className="page relationship-page">
    <div className="page-header">
      <div><h1>Family & Relationship Intelligence</h1><p>Explore family groups and identify relationship data quality issues.</p></div>
      <div className="stats-row">
        <div className="stat-card"><strong>{data.length}</strong><span>Mumineen</span></div>
        <div className="stat-card"><strong>{families.length}</strong><span>Family Groups</span></div>
        <div className="stat-card"><strong>{families.filter(([,m]) => m.length > 1).length}</strong><span>Multi-member Families</span></div>
      </div>
    </div>
    <div className="card" style={{marginBottom:16}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search family, name, ITS, Sabil or sector…" style={{flex:1,minWidth:260}} />
        <button className={familyOnly ? "active" : ""} onClick={()=>setFamilyOnly(v=>!v)}>{familyOnly ? "Family groups" : "All records"}</button>
      </div>
    </div>
    <div className="relationship-grid">
      {results.map(([familyId, members]) => <div className="card family-card" key={familyId}>
        <div className="family-card-head"><div><strong>Family {familyId}</strong><div className="muted">{members.length} member{members.length===1?"":"s"}</div></div></div>
        <div className="family-members">
          {members.map(m => <button className="family-member" key={m.its_number || m.id || m.name} onClick={()=>openMumin(m)}>
            <span className="member-avatar">{String(m.name || "?").trim().charAt(0).toUpperCase()}</span>
            <span><strong>{label(m.name)}</strong><small>ITS {label(m.its_number)} · {label(m.gender)} · {label(m.age)}</small></span>
            <span className="member-arrow">›</span>
          </button>)}
        </div>
      </div>)}
      {!results.length && <div className="card empty-state">No family groups match your search.</div>}
    </div>
  </div>;
}
