import { useAppContext } from "../context/AppContext.jsx"; 
import { Spinner } from "../components/Shared.jsx"; 

export function SectorModal() {   
  var ctx = useAppContext();   
  var sectorModal = ctx.sectorModal, closeSectorModal = ctx.closeSectorModal;   
  var sectorForm = ctx.sectorForm, setSectorForm = ctx.setSectorForm;   
  var saving = ctx.saving, saveSector = ctx.saveSector;   
  var muminData = ctx.muminData, getMuminByIts = ctx.getMuminByIts;   
  
  if (!sectorModal) return null;   
  
  return (     
    <div className="modal-overlay" onClick={closeSectorModal}>       
      <div className="modal" onClick={function (e) { e.stopPropagation(); }}>         
        <div className="modal-hdr">           
          <div className="modal-title">{sectorModal.mode === "add" ? "New Sector" : "Edit Sector"}</div>           
          <button className="modal-close" onClick={closeSectorModal}>×</button>         
        </div>         
        <div className="modal-body">           
          <div className="form-grid">             
            <div className="form-grp full">               
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Sector Name</label>               
              <input 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={sectorForm.name || ""} 
                onChange={function (e) { setSectorForm(function (f) { return Object.assign({}, f, { name: e.target.value }); }); }} 
                placeholder="e.g. Sector A" 
              />             
            </div>             
            <div className="form-grp full">               
              <div className="text-[11px] uppercase tracking-[2px] text-brand-gold font-semibold mt-2 mb-1">Masool (Sector Head Coordinator)</div>             
            </div>             
            <div className="form-grp full">               
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Link Registered Mumin (Optional)</label>               
              <select                 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={sectorForm.masool_its || ""}                 
                onChange={function (e) {                   
                  setSectorForm(function (f) {                     
                    return Object.assign({}, f, {                       
                      masool_its: e.target.value,                       
                      masool_name: "",                       
                      masool_phone: e.target.value ? (getMuminByIts(e.target.value) ? getMuminByIts(e.target.value).phone : "") : f.masool_phone,                     
                    });                   
                  });                 
                }}               
              >                 
                <option value="" className="bg-brand-panel text-brand-muted">&mdash; Type name manually instead &mdash;</option>                 
                {muminData.map(function (m) { return <option key={m.id} value={m.its_number} className="bg-brand-panel">{m.name} ({m.its_number})</option>; })}               
              </select>             
            </div>             
            {!sectorForm.masool_its && (               
              <div className="form-grp full">                 
                <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Or Type Masool Name</label>                 
                <input 
                  className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                  value={sectorForm.masool_name || ""} 
                  onChange={function (e) { setSectorForm(function (f) { return Object.assign({}, f, { masool_name: e.target.value }); }); }} 
                  placeholder="Masool full name" 
                />               
              </div>             
            )}             
            <div className="form-grp full">               
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Masool Phone</label>               
              <input 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={sectorForm.masool_phone || ""} 
                onChange={function (e) { setSectorForm(function (f) { return Object.assign({}, f, { masool_phone: e.target.value }); }); }} 
                placeholder="Phone number" 
              />             
            </div>           
          </div>         
        </div>         
        <div className="modal-ftr">           
          <button className="btn-ghost px-4 py-2 text-sm rounded-lg" onClick={closeSectorModal} disabled={saving}>Cancel</button>           
          <button className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-1.5" disabled={saving} onClick={saveSector}>
            {saving ? <span><Spinner /> Saving </span> : "Save Sector"}
          </button>         
        </div>       
      </div>     
    </div>   
  ); 
}