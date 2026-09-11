import { useState, useRef } from "react";
import { Spinner } from "./Shared.jsx";
import { MUMIN_COLS } from "../lib/constants.js";
import { downloadBlob, toCSV, toXLS, parseCSV } from "../lib/utils.js";

export function IEModal({ onClose, muminData, onImportMumin, importing }) {
  const [tab, setTab] = useState("export");
  const [preview, setPreview] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const ref = useRef();

  function handleFile(file) {
    var name = file.name.toLowerCase();
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var rows;
        if (name.indexOf(".xls") >= 0) {
          var txt = e.target.result;
          if (txt.indexOf("<Row>") >= 0 || txt.indexOf("<ss:Row") >= 0) {
            var rowMatches = txt.match(/<Row[^>]*>([\s\S]*?)<\/Row>/g) || [];
            var allRows = rowMatches.map(function (row) {
              var cells = row.match(/<Data[^>]*>([\s\S]*?)<\/Data>/g) || [];
              return cells.map(function (c) { return c.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); });
            });
            if (allRows.length < 2) { setPreview({ error: "No data rows found in XLS." }); return; }
            var headers = allRows[0];
            rows = allRows.slice(1).map(function (cells) { var obj = {}; headers.forEach(function (h, i) { obj[h] = cells[i] || ""; }); return obj; });
          } else rows = parseCSV(txt.replace(/\t/g, ","));
        } else {
          rows = name.indexOf(".json") >= 0 ? JSON.parse(e.target.result) : parseCSV(e.target.result);
        }
        setParsedRows(rows); setPreview({ name: file.name, count: rows.length });
      } catch (err) { setPreview({ error: "Could not parse file. Try saving as CSV from Excel first." }); }
    };
    reader.readAsText(file);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ie-modal" onClick={function (e) { e.stopPropagation(); }}>
        <div className="modal-hdr"><div className="modal-title">Import / Export</div><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="ie-tabs">
          <button className={"ie-tab" + (tab === "export" ? " active" : "")} onClick={function () { setTab("export"); }}>⬇ Export</button>
          <button className={"ie-tab" + (tab === "import" ? " active" : "")} onClick={function () { setTab("import"); }}>⬆ Import</button>
        </div>
        <div className="ie-body">
          {tab === "export" && <div>
            <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Download Mumin data as CSV, XLS or JSON.</p>
            <div className="ie-opt">
              <div><div className="ie-opt-title">👤 Mumin Data</div><div className="ie-opt-desc">{muminData.length} records</div></div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button className="btn btn-ghost btn-sm" onClick={function () { downloadBlob(toCSV(muminData, MUMIN_COLS), "mumin_data.csv", "text/csv"); }}>CSV</button>
                <button className="btn btn-ghost btn-sm" onClick={function () { toXLS(muminData, MUMIN_COLS, "mumin_data"); }}>XLS</button>
                <button className="btn btn-ghost btn-sm" onClick={function () { downloadBlob(JSON.stringify(muminData, null, 2), "mumin_data.json", "application/json"); }}>JSON</button>
              </div>
            </div>
          </div>}
          {tab === "import" && <div>
            <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>Import Mumin records. Existing records are not deleted.</p>
            <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>Columns: <span style={{ color: "#c9a84c", fontFamily: "monospace" }}>{MUMIN_COLS.join(", ")}</span></p>
            <input ref={ref} type="file" accept=".csv,.json,.xls,.xlsx" style={{ display: "none" }} onChange={function (e) { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
            <div className="drop-zone" onClick={function () { ref.current.click(); }}><div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>📂</div><div style={{ fontSize: 13, color: "#9ca3af" }}>Click to choose file</div><div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>CSV, JSON, XLS supported</div></div>
            {preview && !preview.error && <div className="imp-preview"><strong>{preview.name}</strong> — <strong>{preview.count} rows</strong> ready to import.</div>}
            {preview && preview.error && <div className="imp-preview" style={{ color: "#f87171" }}>⚠ {preview.error}</div>}
            {parsedRows.length > 0 && <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}><button className="btn btn-primary" disabled={importing} onClick={function () { onImportMumin(parsedRows); }}>{importing ? <span><Spinner /> Importing…</span> : "Import " + parsedRows.length + " rows ☁"}</button></div>}
          </div>}
        </div>
      </div>
    </div>
  );
}
