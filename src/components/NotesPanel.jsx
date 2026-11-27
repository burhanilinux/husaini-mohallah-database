import { useState } from "react";
import { Spinner } from "./Shared.jsx";

var plainLabel = { textTransform: "none", letterSpacing: 0, fontSize: 12, color: "#9ca3af", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" };
var checkbox = { width: "auto", minWidth: 13 };

// api = result of useRecordNotes(). Render only for admin/editor users.
export function NotesPanel({ api, userEmail, canDelete, title }) {
  var [text, setText] = useState("");
  var [printable, setPrintable] = useState(false);
  var [busy, setBusy] = useState(false);
  var [err, setErr] = useState("");
  var [editId, setEditId] = useState(null);
  var [editText, setEditText] = useState("");
  var [editPrintable, setEditPrintable] = useState(false);

  async function run(fn) {
    setBusy(true); setErr("");
    try { await fn(); } catch (e) { setErr(e.message || "Could not save the note."); }
    setBusy(false);
  }
  function submit() {
    if (!text.trim()) return;
    run(async function () { await api.add(text, printable, userEmail); setText(""); setPrintable(false); });
  }
  function saveEdit() {
    if (!editText.trim()) return;
    run(async function () { await api.update(editId, editText, editPrintable); setEditId(null); });
  }
  function startEdit(n) { setEditId(n.id); setEditText(n.note); setEditPrintable(!!n.is_printable); }
  function del(n) {
    if (!window.confirm("Delete this note permanently?")) return;
    run(function () { return api.remove(n.id); });
  }

  return (
    <div className="preview-section" style={{ border: "1px solid rgba(201,168,76,.18)", borderRadius: 10, padding: 14, background: "rgba(201,168,76,.03)" }}>
      <div className="preview-sec-title" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span>🔒 {title || "Private Notes"} ({api.notes.length})</span>
        <span style={{ fontSize: 10, color: "#6b7280", textTransform: "none", letterSpacing: 0 }}>Visible to admin/editor only · never printed unless allowed</span>
      </div>
      {(err || api.error) && <div className="err-banner" role="alert" style={{ marginBottom: 10 }}>{err || api.error}</div>}

      <textarea rows={3} maxLength={5000} placeholder="Write a remark…" value={text} onChange={function (e) { setText(e.target.value); }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        <label style={plainLabel}><input type="checkbox" style={checkbox} checked={printable} onChange={function (e) { setPrintable(e.target.checked); }} /> Allow on print</label>
        <button className="btn btn-primary btn-sm" disabled={busy || !text.trim()} onClick={submit}>{busy ? <Spinner /> : "＋ Add note"}</button>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {api.loading && api.notes.length === 0 && <div style={{ fontSize: 12, color: "#6b7280" }}><Spinner /> Loading notes…</div>}
        {!api.loading && api.notes.length === 0 && <div style={{ fontSize: 12, color: "#6b7280" }}>No notes yet.</div>}
        {api.notes.map(function (n) {
          var editing = editId === n.id;
          return (
            <div key={n.id} style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "9px 11px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10, color: "#6b7280", marginBottom: 5, flexWrap: "wrap" }}>
                <span>{n.created_by || "Unknown"} · {n.created_at ? new Date(n.created_at).toLocaleString("en-IN") : ""}{n.updated_at && n.updated_at !== n.created_at ? " · edited" : ""}</span>
                <span style={{ color: n.is_printable ? "#fbbf24" : "#6b7280" }}>{n.is_printable ? "🖨 Printable" : "🔒 Private"}</span>
              </div>
              {editing ? (
                <div>
                  <textarea rows={3} maxLength={5000} value={editText} onChange={function (e) { setEditText(e.target.value); }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <label style={plainLabel}><input type="checkbox" style={checkbox} checked={editPrintable} onChange={function (e) { setEditPrintable(e.target.checked); }} /> Allow on print</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={function () { setEditId(null); }}>Cancel</button>
                      <button className="btn btn-primary btn-sm" disabled={busy || !editText.trim()} onClick={saveEdit}>Save</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: "#e2d9c9", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{n.note}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={function () { startEdit(n); }}>Edit</button>
                    {canDelete && <button className="btn btn-danger" disabled={busy} onClick={function () { del(n); }}>Delete</button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}