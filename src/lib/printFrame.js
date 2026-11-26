import "../printFrame.css";

// In-app print preview (iframe overlay). No popups, no window.open, so it works in
// installed PWAs (iOS + Android). The Print button is a real user gesture.
var overlayEl = null, keyHandler = null;

function esc(v) {
  return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function isDesktopPointer() {
  try { return window.matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (_e) { return false; }
}

// Auto-print scripts from the old popup documents are stripped; the button prints instead.
function prepare(html) {
  var clean = String(html).replace(/<script[\s\S]*?<\/script>/gi, "");
  var inject = "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<style>@media screen and (max-width:760px){body{padding:8px!important;overflow-x:auto}" +
    ".sheet{padding:8px!important;max-width:none!important;overflow-x:auto}.idcard-page{min-height:0!important}}</style>";
  if (/<\/head>/i.test(clean)) return clean.replace(/<\/head>/i, function () { return inject + "</head>"; });
  return inject + clean;
}

export function closePrintFrame() {
  if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
  overlayEl = null;
  document.body.style.overflow = "";
  if (keyHandler) { document.removeEventListener("keydown", keyHandler); keyHandler = null; }
}

function printNow(frame) {
  try { frame.contentWindow.focus(); frame.contentWindow.print(); }
  catch (_e) { alert("Printing isn't available here. Use your browser menu → Print / Share."); }
}

export function printHtml(title, html, options) {
  closePrintFrame();
  var opts = options || {};
  var overlay = document.createElement("div");
  overlay.className = "pf-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  var bar = document.createElement("div"); bar.className = "pf-bar";
  var t = document.createElement("div"); t.className = "pf-title"; t.textContent = title || "Print preview";
  var actions = document.createElement("div"); actions.className = "pf-actions";
  var printBtn = document.createElement("button"); printBtn.className = "btn btn-primary"; printBtn.textContent = "🖨 Print / Save PDF";
  var closeBtn = document.createElement("button"); closeBtn.className = "btn btn-ghost"; closeBtn.textContent = "✕ Close";
  actions.appendChild(printBtn); actions.appendChild(closeBtn);
  bar.appendChild(t); bar.appendChild(actions);

  var frame = document.createElement("iframe");
  frame.className = "pf-frame";
  frame.title = title || "Print preview";
  printBtn.onclick = function () { printNow(frame); };
  closeBtn.onclick = closePrintFrame;
  if (!opts.manual && isDesktopPointer()) {
    frame.addEventListener("load", function () { setTimeout(function () { printNow(frame); }, 250); });
  }
  frame.srcdoc = prepare(html);

  overlay.appendChild(bar); overlay.appendChild(frame);
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
  keyHandler = function (e) { if (e.key === "Escape") closePrintFrame(); };
  document.addEventListener("keydown", keyHandler);
  overlayEl = overlay;
}

var BASE_CSS = "@page{margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
  "body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;margin:0;padding:14px;font-size:12px}" +
  "table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #aaa;padding:4px 6px;text-align:left;color:#111;background:#fff;vertical-align:top}th{background:#eee}" +
  ".print-header{display:block;text-align:center;border-bottom:2px solid #c9a84c;padding-bottom:10px;margin-bottom:12px}.print-header h2{font-size:20px;margin:0 0 4px}.print-header p{margin:0;color:#555;font-size:12px}" +
  ".card-hdr{font-weight:700;margin:8px 0}.no-print,button,.survey-report-filters,.survey-report-actions,.survey-section-head p{display:none!important}" +
  ".survey-report-table-wrap,div[style*='overflow']{overflow:visible!important;max-height:none!important}img{max-width:100%}" +
  "@media screen and (max-width:760px){body{overflow-x:auto}}";

// Print the HTML of existing page elements (used by in-app report tables).
export function printElements(nodes, title) {
  var list = (Array.isArray(nodes) ? nodes : [nodes]).filter(Boolean);
  if (!list.length) { alert("Nothing to print."); return; }
  var body = list.map(function (n) { return n.outerHTML; }).join("");
  printHtml(title, "<!doctype html><html><head><meta charset='utf-8'><title>" + esc(title) + "</title><style>" + BASE_CSS + "</style></head><body>" + body + "</body></html>");
}
