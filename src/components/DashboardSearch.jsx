import { useState } from "react";
import { useAppContext } from "../context/AppContext.jsx";

export function DashboardSearch() {
  var ctx = useAppContext();
  var muminData = ctx.muminData, filesData = ctx.filesData;
  var setMuminPreview = ctx.setMuminPreview, setFilePreview = ctx.setFilePreview;

  var [query, setQuery] = useState("");
  var [open, setOpen] = useState(false);

  var q = query.toLowerCase();
  var mRes = query ? muminData.filter(function (m) {
    return (m.name || "").toLowerCase().includes(q)
      || (m.its_number || "").includes(q)
      || (m.area_sector || "").toLowerCase().includes(q);
  }).slice(0, 5) : [];
  var fRes = query ? filesData.filter(function (f) {
    return (f.title || "").toLowerCase().includes(q) || (f.file_no || "").toLowerCase().includes(q);
  }).slice(0, 5) : [];
  var sRes = query ? muminData.filter(function (m) {
    return m.sabil_no && String(m.sabil_no).toLowerCase().includes(q);
  }).slice(0, 5) : [];
  var total = mRes.length + fRes.length + sRes.length;

  function selectMumin(m) { setMuminPreview(m); setQuery(""); setOpen(false); }
  function selectFile(f) { setFilePreview(f); setQuery(""); setOpen(false); }

  return (
    <div className="dash-search-wrap">
      <div className="dash-search-box">
        <span className="dash-search-icon">🔍</span>
        <input
          className="dash-search-input"
          placeholder="Search Mumin, Files, or Sabil No…"
          value={query}
          onChange={function (e) { setQuery(e.target.value); setOpen(e.target.value.length > 0); }}
          onFocus={function () { if (query.length > 0) setOpen(true); }}
          onBlur={function () { setTimeout(function () { setOpen(false); }, 200); }}
        />
      </div>

      {open && (
        <div className="dash-search-results">
          {total === 0 && <div className="dash-search-empty">No results for "{query}"</div>}

          {mRes.length > 0 && (
            <div className="dash-search-section">
              <div className="dash-search-sec-title">Mumin</div>
              {mRes.map(function (m) {
                return (
                  <div className="dash-search-item" key={m.id} onClick={function () { selectMumin(m); }}>
                    <span className="dash-search-item-icon">👤</span>
                    <div className="dash-search-item-main">
                      <div className="dash-search-item-title">{m.name}</div>
                      <div className="dash-search-item-sub">ITS: {m.its_number} · {m.gender}{m.area_sector ? " · " + m.area_sector : ""}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {fRes.length > 0 && (
            <div className="dash-search-section">
              <div className="dash-search-sec-title">Files</div>
              {fRes.map(function (f) {
                return (
                  <div className="dash-search-item" key={f.id} onClick={function () { selectFile(f); }}>
                    <span className="dash-search-item-icon">🗂</span>
                    <div className="dash-search-item-main">
                      <div className="dash-search-item-title">{f.title}</div>
                      <div className="dash-search-item-sub">{f.file_no} · {f.umoor_type}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {sRes.length > 0 && (
            <div className="dash-search-section">
              <div className="dash-search-sec-title">Sabil No.</div>
              {sRes.map(function (m) {
                return (
                  <div className="dash-search-item" key={"sabil-" + m.id} onClick={function () { selectMumin(m); }}>
                    <span className="dash-search-item-icon">🏠</span>
                    <div className="dash-search-item-main">
                      <div className="dash-search-item-title">Sabil No. {m.sabil_no}</div>
                      <div className="dash-search-item-sub">{m.name}</div>
                    </div>
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
