import { useAppContext } from "../context/AppContext.jsx"; 

export function GlobalSearch() {   
  var ctx = useAppContext();   
  var gSearch = ctx.gSearch, setGSearch = ctx.setGSearch;   
  var gSearchOpen = ctx.gSearchOpen, setGSearchOpen = ctx.setGSearchOpen;   
  var muminData = ctx.muminData, filesData = ctx.filesData;   
  var setMuminPreview = ctx.setMuminPreview, setFilePreview = ctx.setFilePreview;   

  return (     
    <div className="relative mx-3 my-2">       
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">🔍</span>       
      <input         
        className="w-full bg-white/[0.04] border border-brand-gold/20 text-brand-text rounded-xl pl-9 pr-4 py-2 text-xs outline-none transition-all focus:border-brand-gold/50" 
        placeholder="Search database..."         
        value={gSearch}         
        onChange={function (e) { setGSearch(e.target.value); setGSearchOpen(e.target.value.length > 0); }}         
        onFocus={function () { if (gSearch.length > 0) setGSearchOpen(true); }}         
        onBlur={function () { setTimeout(function () { setGSearchOpen(false); }, 200); }}       
      />       
      {gSearchOpen && (function () {         
        var q = gSearch.toLowerCase();         
        var mRes = muminData.filter(function (m) {           
          return (m.name || "").toLowerCase().includes(q)             
            || (m.its_number || "").includes(q)             
            || (m.area_sector || "").toLowerCase().includes(q);         
        }).slice(0, 5);         
        var fRes = filesData.filter(function (f) {           
          return (f.title || "").toLowerCase().includes(q) || (f.file_no || "").toLowerCase().includes(q);         
        }).slice(0, 5);         
        var famRes = muminData.filter(function (m) {           
          return m.sabil_no && String(m.sabil_no).toLowerCase().includes(q);         
        }).slice(0, 5);         
        var total = mRes.length + fRes.length + famRes.length;         
        
        return (           
          <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-brand-panel border border-brand-gold/20 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto divide-y divide-white/[0.04]">             
            {total === 0 && <div className="p-5 text-center text-gray-600 text-xs">No records for "{gSearch}"</div>}             
            {mRes.length > 0 && (               
              <div className="py-2">                 
                <div className="text-[9px] font-bold uppercase tracking-wider text-brand-gold px-4 pb-1">Mumin</div>                 
                {mRes.map(function (m) {                   
                  return (                     
                    <div className="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors hover:bg-brand-gold/[0.06]" key={m.id} onClick={function () { setMuminPreview(m); setGSearch(""); setGSearchOpen(false); }}>                       
                      <span className="text-sm">👤</span>                       
                      <div className="min-w-0 flex-1">                         
                        <div className="text-xs font-medium text-brand-text truncate">{m.name}</div>                         
                        <div className="text-[10px] text-brand-muted truncate">ITS: {m.its_number} {m.area_sector ? "• " + m.area_sector : ""}</div>                       
                      </div>                     
                    </div>                   
                  );                 })}               
              </div>             )}             
            {fRes.length > 0 && (               
              <div className="py-2">                 
                <div className="text-[9px] font-bold uppercase tracking-wider text-brand-gold px-4 pb-1">Files</div>                 
                {fRes.map(function (f) {                   
                  return (                     
                    <div className="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors hover:bg-brand-gold/[0.06]" key={f.id} onClick={function () { setFilePreview(f); setGSearch(""); setGSearchOpen(false); }}>                       
                      <span className="text-sm">📁</span>                       
                      <div className="min-w-0 flex-1">                         
                        <div className="text-xs font-medium text-brand-text truncate">{f.title}</div>                         
                        <div className="text-[10px] text-brand-muted truncate">{f.file_no} • {f.umoor_type}</div>                       
                      </div>                     
                    </div>                   
                  );                 })}               
              </div>             )}             
            {famRes.length > 0 && (               
              <div className="py-2">                 
                <div className="text-[9px] font-bold uppercase tracking-wider text-brand-gold px-4 pb-1">Sabil No.</div>                 
                {famRes.map(function (m) {                   
                  return (                     
                    <div className="flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors hover:bg-brand-gold/[0.06]" key={"sabil-" + m.id} onClick={function () { setMuminPreview(m); setGSearch(""); setGSearchOpen(false); }}>                       
                      <span className="text-sm">🏠</span>                       
                      <div className="min-w-0 flex-1">                         
                        <div className="text-xs font-medium text-brand-text truncate">Sabil No. {m.sabil_no}</div>                         
                        <div className="text-[10px] text-brand-muted truncate">{m.name}</div>                       
                      </div>                     
                    </div>                   
                  );                 })}               
              </div>             )}           
          </div>         
        );       })()}     
    </div>   
  ); 
}