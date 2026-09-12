import { useAppContext } from "../context/AppContext.jsx";
import { getExtendedProfile } from "../lib/muminProfile.js";

export function GlobalSearch() {
  var ctx = useAppContext();
  var gSearch = ctx.gSearch, setGSearch = ctx.setGSearch;
  var gSearchOpen = ctx.gSearchOpen, setGSearchOpen = ctx.setGSearchOpen;
  var muminData = ctx.muminData, filesData = ctx.filesData;
  var setMuminPreview = ctx.setMuminPreview, setFilePreview = ctx.setFilePreview;

  return (
    <div style={{ marginTop: 8, position: "relative" }} className="gsearch-wrap">
      <span className="gsearch-icon">🔍</span>
      <input
        className="gsearch-input" placeholder="Search everything..."
        value={gSearch}
        onChange={function (e) { setGSearch(e.target.value); setGSearchOpen(e.target.value.length > 0); }}
        onFocus={function () { if (gSearch.length > 0) setGSearchOpen(true); }}
        onBlur={function () { setTimeout(function () { setGSearchOpen(false); }, 200); }}
      />
      {gSearchOpen && (function () {
        var q = gSearch.toLowerCase();
        var mRes = muminData.filter(function (m) {
          var ext = getExtendedProfile(m);
          return (m.name || "").toLowerCase().includes(q)
            || (m.its_number || "").includes(q)
            || (m.area_sector || "").toLowerCase().includes(q)
            || (ext.occupation || "").toLowerCase().includes(q)
            || (ext.city || "").toLowerCase().includes(q);
        }).slice(0, 5);
        var fRes = filesData.filter(function (f) {
          return (f.title || "").toLowerCase().includes(q) || (f.file_no || "").toLowerCase().includes(q);
        }).slice(0, 5);
        var famRes = muminData.filter(function (m) {
          return m.sabil_no && String(m.sabil_no).toLowerCase().includes(q);
        }).slice(0, 5);
        var total = mRes.length + fRes.length + famRes.length;

        return (
          <div className="gsearch-results">
            {total === 0 && <div className="gsearch-empty">No results for "{gSearch}"</div>}

            {mRes.length > 0 && (
              <div className="gsearch-section">
                <div className="gsearch-sec-title">Mumin</div>
                {mRes.map(function (m) {
                  return (
                    <div className="gsearch-item" key={m.id} onClick={function () { setMuminPreview(m); setGSearch(""); setGSearchOpen(false); }}>
                      <span className="gsearch-item-icon">👤</span>
                      <div className="gsearch-item-main">
                        <div className="gsearch-item-title">{m.name}</div>
                        <div className="gsearch-item-sub">ITS: {m.its_number} · {m.gender}{m.area_sector ? " · " + m.area_sector : ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {fRes.length > 0 && mRes.length > 0 && <div className="gsearch-divider" />}
            {fRes.length > 0 && (
              <div className="gsearch-section">
                <div className="gsearch-sec-title">Files</div>
                {fRes.map(function (f) {
                  return (
                    <div className="gsearch-item" key={f.id} onClick={function () { setFilePreview(f); setGSearch(""); setGSearchOpen(false); }}>
                      <span className="gsearch-item-icon">🗂</span>
                      <div className="gsearch-item-main">
                        <div className="gsearch-item-title">{f.title}</div>
                        <div className="gsearch-item-sub">{f.file_no} · {f.umoor_type}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {famRes.length > 0 && (fRes.length > 0 || mRes.length > 0) && <div className="gsearch-divider" />}
            {famRes.length > 0 && (
              <div className="gsearch-section">
                <div className="gsearch-sec-title">Sabil No.</div>
                {famRes.map(function (m) {
                  return (
                    <div className="gsearch-item" key={"sabil-" + m.id} onClick={function () { setMuminPreview(m); setGSearch(""); setGSearchOpen(false); }}>
                      <span className="gsearch-item-icon">🏠</span>
                      <div className="gsearch-item-main">
                        <div className="gsearch-item-title">Sabil No. {m.sabil_no}</div>
                        <div className="gsearch-item-sub">{m.name}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
