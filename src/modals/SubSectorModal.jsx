import { useAppContext } from "../context/AppContext.jsx"; 
import { Spinner } from "../components/Shared.jsx"; 

export function SubSectorModal() {   
  var ctx = useAppContext();   
  var subSectorModal = ctx.subSectorModal, closeSubSectorModal = ctx.closeSubSectorModal;   
  var subSectorForm = ctx.subSectorForm, setSubSectorForm = ctx.setSubSectorForm;   
  var saving = ctx.saving, saveSubSector = ctx.saveSubSector;   
  var muminData = ctx.muminData, getMuminByIts = ctx.getMuminByIts;   
  
  if (!subSectorModal) return null;   
  
  return (     
    <div className="modal-overlay" onClick={closeSubSectorModal}>       
      <div className="modal" onClick={function (e) { e.stopPropagation(); }}>         
        <div className="modal-hdr">           
          <div className="modal-title">{subSectorModal.mode === "add" ? "New Sub-Sector" : "Edit Sub-Sector"}</div>           
          <button className="modal-close" onClick={closeSubSectorModal}>×</button>         
        </div>         
        <div className="modal-body">           
          <div className="form-grid">             
            <div className="form-grp full">               
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Sub-Sector Name</label>               
              <input 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={subSectorForm.name || ""} 
                onChange={function (e) { setSubSectorForm(function (f) { return Object.assign({}, f, { name: e.target.value }); }); }} 
                placeholder="e.g. Sub-Sector A1" 
              />             
            </div>             
            <div className="form-grp full">               
              <div className="text-[11px] uppercase tracking-[2px] text-brand-gold font-semibold mt-2 mb-1">Musaid (Sub-Sector Assistant)</div>             
            </div>             
            <div className="form-grp full">               
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Link Registered Mumin (Optional)</label>               
              <select                 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={subSectorForm.musaid_its || ""}                 
                onChange={function (e) {                   
                  setSubSectorForm(function (f) {                     
                    return Object.assign({}, f, {                       
                      musaid_its: e.target.value,                       
                      musaid_name: "",                       
                      musaid_phone: e.target.value ? (getMuminByIts(e.target.value) ? getMuminByIts(e.target.value).phone : "") : f.musaid_phone,                     
                    });                   
                  });                 
                }}               
              >                 
                <option value="" className="bg-brand-panel text-brand-muted">&mdash; Type name manually instead &mdash;</option>                 
                {muminData.map(function (m) { return <option key={m.id} value={m.its_number} className="bg-brand-panel">{m.name} ({m.its_number})</option>; })}               
              </select>             
            </div>             
            {!subSectorForm.musaid_its && (               
              <div className="form-grp full">                 
                <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Or Type Musaid Name</label>                 
                <input 
                  className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                  value={subSectorForm.musaid_name || ""} 
                  onChange={function (e) { setSubSectorForm(function (f) { return Object.assign({}, f, { musaid_name: e.target.value }); }); }} 
                  placeholder="Musaid full name" 
                />               
              </div>             
            )}             
            <div className="form-grp full">               
              <label className="text-[11px] uppercase tracking-[1.5px] text-brand-muted font-medium mb-1">Musaid Phone</label>               
              <input 
                className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full"
                value={subSectorForm.musaid_phone || ""} 
                onChange={function (e) { setSubSectorForm(function (f) { return Object.assign({}, f, { musaid_phone: e.target.value }); }); }} 
                placeholder="Phone number" 
              />             
            </div>           
          </div>         
        </div>         
        <div className="modal-ftr">           
          <button className="btn-ghost px-4 py-2 text-sm rounded-lg" onClick={closeSubSectorModal} disabled={saving}>Cancel</button>           
          <button className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-1.5" disabled={saving} onClick={saveSubSector}>
            {saving ? <span><Spinner /> Saving </span> : "Save Sub-Sector"}
          </button>         
        </div>       
      </div>     
    </div>   
  ); 
}