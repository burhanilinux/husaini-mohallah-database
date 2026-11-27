import "../printFrame.css";

// In-app print preview. The document is rendered inside a shadow root in the app
// page itself (no popup, no iframe), and the Print button calls window.print() on
// the page. Print CSS (printFrame.css) hides everything except the preview.
// This works in browsers and installed PWAs (iOS + Android), where
// iframe.contentWindow.print() is unreliable.
var overlayEl = null, keyHandler = null, pageStyleEl = null;

function esc(v) {
  return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function isDesktopPointer() {
  try { return window.matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (_e) { return false; }
}

// Split a full HTML document string into: @page rules (must live at document level),
// stylesheet text rewritten for a shadow root (html/body -> :host), and body markup.
function parseDoc(html) {
  var doc = new DOMParser().parseFromString(String(html), "text/html");
  var css = "";
  Array.prototype.slice.call(doc.querySelectorAll("style")).forEach(function (s) {
    css += s.textContent + "\n";
    s.parentNode.removeChild(s);
  });
  Array.prototype.slice.call(doc.querySelectorAll("script")).forEach(function (s) { s.parentNode.removeChild(s); });
  var pages = [];
  var rest = css.replace(/@page\s*[^{]*\{[^}]*\}/g, function (m) { pages.push(m); return ""; });
  rest = rest.replace(/(^|[{},\s])(html|body)(?=[\s,{])/g, "$1:host");
  return { pages: pages.join("\n"), css: rest, body: doc.body ? doc.body.innerHTML : "" };
}

export function closePrintFrame() {
  if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
  overlayEl = null;
  if (pageStyleEl && pageStyleEl.parentNode) pageStyleEl.parentNode.removeChild(pageStyleEl);
  pageStyleEl = null;
  document.body.classList.remove("pf-open");
  document.body.style.overflow = "";
  if (keyHandler) { document.removeEventListener("keydown", keyHandler); keyHandler = null; }
}

function printNow() {
  try { window.focus(); window.print(); }
  catch (_e) { alert("Printing isn't available here. Use your browser menu → Print / Share."); }
}

export function printHtml(title, html, options) {
  closePrintFrame();
  var opts = options || {};
  var parsed = parseDoc(html);

  var overlay = document.createElement("div");
  overlay.className = "pf-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  var bar = document.createElement("div"); bar.className = "pf-bar";
  var t = document.createElement("div"); t.className = "pf-title"; t.textContent = title || "Print preview";
  var actions = document.createElement("div"); actions.className = "pf-actions";
  var printBtn = document.createElement("button"); printBtn.type = "button"; printBtn.className = "btn btn-primary"; printBtn.textContent = "🖨 Print / Save PDF";
  var closeBtn = document.createElement("button"); closeBtn.type = "button"; closeBtn.className = "btn btn-ghost"; closeBtn.textContent = "✕ Close";
  printBtn.onclick = printNow;
  closeBtn.onclick = closePrintFrame;
  actions.appendChild(printBtn); actions.appendChild(closeBtn);
  bar.appendChild(t); bar.appendChild(actions);

  var host = document.createElement("div");
  host.className = "pf-host";
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML = "<style>:host{display:block;margin:0}\n" + parsed.css + "</style><div class='pf-doc'>" + parsed.body + "</div>";

  // @page rules are ignored inside shadow DOM, so they go in the document head.
  if (parsed.pages) {
    pageStyleEl = document.createElement("style");
    pageStyleEl.textContent = parsed.pages;
    document.head.appendChild(pageStyleEl);
  }

  overlay.appendChild(bar); overlay.appendChild(host);
  document.body.appendChild(overlay);
  document.body.classList.add("pf-open");
  document.body.style.overflow = "hidden";
  keyHandler = function (e) { if (e.key === "Escape") closePrintFrame(); };
  document.addEventListener("keydown", keyHandler);
  overlayEl = overlay;

  if (!opts.manual && isDesktopPointer()) setTimeout(printNow, 350);
}

var BASE_CSS = "@page{margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
  "body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;margin:0;padding:14px;font-size:12px}" +
  "table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #aaa;padding:4px 6px;text-align:left;color:#111;background:#fff;vertical-align:top}th{background:#eee}" +
  ".print-header{display:block;text-align:center;border-bottom:2px solid #c9a84c;padding-bottom:10px;margin-bottom:12px}.print-header h2{font-size:20px;margin:0 0 4px}.print-header p{margin:0;color:#555;font-size:12px}" +
  ".card-hdr{font-weight:700;margin:8px 0}.no-print,button,.survey-report-filters,.survey-report-actions,.survey-section-head p{display:none!important}" +
  ".survey-report-table-wrap,div[style*='overflow']{overflow:visible!important;max-height:none!important}img{max-width:100%}";

// Print the HTML of existing page elements (used by in-app report tables).
export function printElements(nodes, title) {
  var list = (Array.isArray(nodes) ? nodes : [nodes]).filter(Boolean);
  if (!list.length) { alert("Nothing to print."); return; }
  var body = list.map(function (n) { return n.outerHTML; }).join("");
  printHtml(title, "<!doctype html><html><head><meta charset='utf-8'><title>" + esc(title) + "</title><style>" + BASE_CSS + "</style></head><body>" + body + "</body></html>");
}
