import { useState, useRef } from "react";
import { Spinner } from "./Shared.jsx";
import { MUMIN_COLS } from "../lib/constants.js";
import { downloadBlob, toCSV, toXLS, parseCSV } from "../lib/utils.js";
import { parseMuminExcel, syncMuminExcel, SOURCE_COLUMNS } from "../lib/excelMuminSync.js";
import { analyzeMuminExcel } from "../lib/excelMuminPreview.js";

export function IEModal({ onClose, muminData, onImportMumin, importing }) {
  const [tab, setTab] = useState("export");
  const [preview, setPreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [detailTab, setDetailTab] = useState("updated");
  const ref = useRef();

  async function handleFile(file) {
    setSyncError(null);
    setAnalysis(null);
    try {
      var name = file.name.toLowerCase();
      var rows;
      if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm")) {
        rows = await parseMuminExcel(file);
      } else {
        var reader = new FileReader();
        rows = await new Promise(function (resolve, reject) {
          reader.onload = function (e) {
            try {
              resolve(name.endsWith(".json") ? JSON.parse(e.target.result) : parseCSV(e.target.result));
            } catch (err) { reject(err); }
          };
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }
      if (!Array.isArray(rows) || !rows.length) throw new Error("No data rows found in the selected file.");
      setParsedRows(rows);
      var hasJamaatColumns = ["ITS_ID", "Full_Name", "Family_ID", "Sector", "Sub_Sector"].every(function (c) {
        return Object.prototype.hasOwnProperty.call(rows[0], c);
      });
      var families = {}, sectors = {}, subs = {};
      rows.forEach(function (r) {
        if (r.Family_ID) families[String(r.Family_ID)] = true;
        if (r.Sector) sectors[String(r.Sector).trim()] = true;
        if (r.Sector && r.Sub_Sector) subs[String(r.Sector).trim() + "\u0000" + String(r.Sub_Sector).trim()] = true;
      });
      var nextAnalysis = hasJamaatColumns ? analyzeMuminExcel(rows, muminData) : null;
      setAnalysis(nextAnalysis);
      setPreview({
        name: file.name,
        count: rows.length,
        columns: Object.keys(rows[0]).length,
        jamaat: hasJamaatColumns,
        families: Object.keys(families).length,
        sectors: Object.keys(sectors).filter(Boolean).length,
        subSectors: Object.keys(subs).length,
      });
    } catch (err) {
      setParsedRows([]);
      setAnalysis(null);
      setPreview({ error: "Could not parse file: " + (err.message || "Unknown error") });
    }
  }

  async function startImport() {
    if (!parsedRows.length) return;
    setSyncError(null);
    if (preview && preview.jamaat) {
      if (analysis && analysis.blocking) {
        setSyncError("Import is blocked until the Invalid and duplicate-ITS conflicts are resolved.");
        return;
      }
      setSyncing(true);
      try {
        await syncMuminExcel(parsedRows);
        window.location.reload();
      } catch (e) {
        setSyncError(e.message || "Import failed");
        setSyncing(false);
      }
      return;
    }
    onImportMumin(parsedRows);
  }

  function detailRows() {
    return analysis && analysis.details ? analysis.details[detailTab] || [] : [];
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
            <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>
              Excel synchronization uses ITS_ID as the stable key, preserves the complete source row, and does not delete records missing from the workbook. A full preview is shown before anything is synchronized.
            </p>
            <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
              Full Jamaat workbook columns supported: <span style={{ color: "#c9a84c", fontFamily: "monospace" }}>{SOURCE_COLUMNS.length}</span>
            </p>
            <input ref={ref} type="file" accept=".csv,.json,.xls,.xlsx,.xlsm" style={{ display: "none" }} onChange={function (e) { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
            <div className="drop-zone" onClick={function () { ref.current.click(); }}><div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>📂</div><div style={{ fontSize: 13, color: "#9ca3af" }}>Click to choose file</div><div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>CSV, JSON, XLS, XLSX supported</div></div>

            {preview && !preview.error && <div className="imp-preview">
              <strong>{preview.name}</strong> — <strong>{preview.count} rows</strong>, <strong>{preview.columns} columns</strong> ready.
              {preview.jamaat && <div style={{ marginTop: 6, fontSize: 11 }}>Families: {preview.families} · Sectors: {preview.sectors} · Sub-sectors: {preview.subSectors} · ITS_ID detected ✓</div>}
              {preview.jamaat && preview.columns < 77 && <div style={{ marginTop: 6, color: "#f59e0b", fontSize: 11 }}>This workbook has fewer than the expected 77 source columns; only supplied columns will be preserved.</div>}
            </div>}

            {analysis && <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Synchronization Preview</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 6 }}>
                {["new", "updated", "unchanged", "conflicts", "invalid"].map(function (key) {
                  var labels = { new: "New", updated: "Updated", unchanged: "Unchanged", conflicts: "Conflicts", invalid: "Invalid" };
                  var value = analysis.counts[key];
                  return <button key={key} className="btn btn-ghost btn-sm" style={{ textAlign: "left", padding: "9px 8px", borderColor: (detailTab === key ? "#c9a84c" : undefined) }} onClick={function () { setDetailTab(key); }}><div style={{ fontSize: 10, color: "#9ca3af" }}>{labels[key]}</div><div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div></button>;
                })}
              </div>
              {analysis.blocking && <div style={{ marginTop: 10, padding: 10, border: "1px solid #7f1d1d", color: "#fca5a5", borderRadius: 6, fontSize: 11 }}>⚠ Synchronization is blocked. Fix all invalid rows and duplicate ITS_ID conflicts before importing.</div>}
              {!analysis.blocking && analysis.counts.conflicts > 0 && <div style={{ marginTop: 10, padding: 10, border: "1px solid #854d0e", color: "#fbbf24", borderRadius: 6, fontSize: 11 }}>⚠ {analysis.counts.conflicts} non-blocking data conflict(s) were detected. Review them before synchronizing.</div>}
              <div style={{ marginTop: 10, maxHeight: 180, overflow: "auto", border: "1px solid #252a33", borderRadius: 6 }}>
                {detailRows().length === 0 ? <div style={{ padding: 14, color: "#6b7280", fontSize: 11 }}>No {detailTab} rows.</div> : <table><thead><tr><th>Row</th><th>ITS</th><th>Name</th><th>Details</th></tr></thead><tbody>{detailRows().slice(0, 100).map(function (r, i) { return <tr key={i}><td>{r.row || "—"}</td><td>{r.its || "—"}</td><td>{r.name || "—"}</td><td>{r.reason || (r.changes ? r.changes.join(", ") : "—")}</td></tr>; })}</tbody></table>}
              </div>
              {detailRows().length > 100 && <div style={{ fontSize: 10, color: "#6b7280", marginTop: 5 }}>Showing first 100 rows in this preview.</div>}
            </div>}

            {preview && preview.error && <div className="imp-preview" style={{ color: "#f87171" }}>⚠ {preview.error}</div>}
            {syncError && <div className="imp-preview" style={{ color: "#f87171", marginTop: 8 }}>⚠ {syncError}</div>}
            {parsedRows.length > 0 && <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary" disabled={importing || syncing || (preview && preview.jamaat && analysis && analysis.blocking)} onClick={startImport}>
                {syncing ? <span><Spinner /> Synchronizing…</span> : importing ? <span><Spinner /> Importing…</span> : (preview && preview.jamaat ? "Synchronize " + parsedRows.length + " records ☁" : "Import " + parsedRows.length + " rows ☁")}
              </button>
            </div>}
          </div>}
        </div>
      </div>
    </div>
  );
}
