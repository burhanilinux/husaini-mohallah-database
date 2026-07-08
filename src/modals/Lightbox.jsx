import { useAppContext } from "../context/AppContext.jsx";

export function Lightbox() {
  var ctx = useAppContext();
  var lightbox = ctx.lightbox, setLightbox = ctx.setLightbox;

  if (!lightbox) return null;

  return (
    <div className="lightbox" onClick={function () { setLightbox(null); }}>
      <button className="lightbox-close" onClick={function () { setLightbox(null); }}>×</button>
      <img src={lightbox.url} alt={lightbox.name} onClick={function (e) { e.stopPropagation(); }} />
      <div className="lightbox-name">{lightbox.name}</div>
    </div>
  );
}
