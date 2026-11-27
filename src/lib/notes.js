// PRIVATE REMARKS — data access + print helpers.
// Notes must NEVER be added to MUMIN_LIST_COLS, MUMIN_COLS, FIELD_OPTIONS,
// FULL_PROFILE_SECTIONS, liveMap, backups or Excel exports. They reach a print
// only through printableNotes() (flagged + user ticked the print checkbox).
import { useCallback, useEffect, useRef, useState } from "react";
import { sbGet, sbInsert, sbUpdate, sbDelete } from "./supabase.js";

// kind: "mumin" (id = mumin_data.id) or "family" (id = families.family_id)
export function useRecordNotes(kind, id, enabled) {
  var [notes, setNotes] = useState([]);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState("");
  var latest = useRef(0);
  var column = kind === "family" ? "family_id" : "mumin_id";
  var active = !!enabled && id !== null && id !== undefined && id !== "";

  var reload = useCallback(async function () {
    var ticket = ++latest.current;
    if (!active) { setNotes([]); setError(""); return; }
    setLoading(true); setError("");
    try {
      var rows = await sbGet("record_notes", "select=*&" + column + "=eq." + encodeURIComponent(id) + "&order=created_at.desc");
      if (ticket === latest.current) setNotes(Array.isArray(rows) ? rows : []);
    } catch (e) {
      if (ticket === latest.current) { setNotes([]); setError(e.message || "Could not load notes."); }
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }, [active, column, id]);

  useEffect(function () { reload(); }, [reload]);

  async function add(text, printable, email) {
    var body = { note: String(text).trim(), is_printable: !!printable, created_by: email || "Unknown" };
    body[column] = id;
    await sbInsert("record_notes", body, false);
    await reload();
  }
  async function update(noteId, text, printable) {
    await sbUpdate("record_notes", noteId, { note: String(text).trim(), is_printable: !!printable, updated_at: new Date().toISOString() });
    await reload();
  }
  async function remove(noteId) {
    await sbDelete("record_notes", noteId);
    await reload();
  }

  return { notes: notes, loading: loading, error: error, reload: reload, add: add, update: update, remove: remove };
}

// Only flagged notes, and only when the user opted in at print time.
export function printableNotes(notes, include) {
  return include ? (notes || []).filter(function (n) { return n.is_printable; }) : [];
}

function esc(v) {
  return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Appended to each print document's <style>. Sizes are em-based so it scales
// with the A4 / A5 / Full Profile / Family base font.
export var REMARKS_CSS =
  ".remarks{border:1px solid #e1e1e1;border-radius:4px;padding:6px 8px;margin-top:4px}" +
  ".remark{font-size:1em;line-height:1.35;white-space:pre-wrap;word-break:break-word;margin-bottom:5px;break-inside:avoid}" +
  ".remark:last-child{margin-bottom:0}" +
  ".remark small{display:block;color:#888;font-size:.75em;margin-bottom:1px}";

// Returns "" when there is nothing to print, so callers can always append it.
export function remarksSectionHtml(notes) {
  if (!notes || !notes.length) return "";
  var items = notes.map(function (n) {
    var d = n.created_at ? new Date(n.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
    return "<div class='remark'><small>" + esc(d) + "</small>" + esc(n.note) + "</div>";
  }).join("");
  return "<div class='section'><div class='section-title'>Remarks</div><div class='remarks'>" + items + "</div></div>";
}