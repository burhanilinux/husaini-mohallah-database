import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import { YEARS, UMOOR_TYPES } from "../lib/constants.js";

export function FilesPage() {
  var ctx = useAppContext();
  var selYear = ctx.selYear, setSelYear = ctx.setSelYear;
  var canEdit = ctx.canEdit, canDelete = ctx.canDelete;
  var openModal = ctx.openModal, loadAll = ctx.loadAll, loading = ctx.loading;
  var search = ctx.search, setSearch = ctx.setSearch;
  var selUmoor = ctx.selUmoor, setSelUmoor = ctx.setSelUmoor;
  var filteredFiles = ctx.filteredFiles, getFileAtts = ctx.getFileAtts;
  var setFilePreview = ctx.setFilePreview, deleteRecord = ctx.deleteRecord;

  return (
    <div className="w-full flex-1 p-6 md:p-9 lg:ml-[260px]">
      {/* Header Framework Layout */}
      <div className="mb-8">
        <div className="font-sans text-2xl font-bold text-brand-gold sm:text-[28px]">Umoor Files</div>
        <div className="mt-1 text-xs text-brand-muted sm:text-[13px]">Documents, scans and records workspace</div>
      </div>

      {/* Responsive Year Navigation Tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 flex-wrap sm:flex-nowrap">
        <button 
          className={"px-[18px] py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-all duration-200 shrink-0 " + 
            (!selYear ? "bg-brand-gold text-brand-bg border-brand-gold" : "border-brand-gold/15 text-brand-muted bg-transparent hover:border-brand-gold/30 hover:text-brand-gold")} 
          onClick={function () { setSelYear(null); }}
        >
          All Years
        </button>
        {YEARS.map(function (y) {
          return (
            <button 
              key={y} 
              className={"px-[18px] py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-all duration-200 shrink-0 " + 
                (selYear === y ? "bg-brand-gold text-brand-bg border-brand-gold" : "border-brand-gold/15 text-brand-muted bg-transparent hover:border-brand-gold/30 hover:text-brand-gold")} 
              onClick={function () { setSelYear(y); }}
            >
              {y}
            </button>
          );
        })}
      </div>

      {/* Main Files Table Card Component */}
      <div className="bg-white/[0.02] border border-brand-gold/10 rounded-xl overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gold/10 flex-wrap gap-2">
          <span className="text-sm font-semibold text-brand-text">Files Database ({filteredFiles.length})</span>
          {canEdit && (
            <button className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm cursor-pointer" onClick={function () { openModal("file", "add"); }}>
              + New File
            </button>
          )}
        </div>

        {/* Filters Toolbar Workspace */}
        <div className="flex items-center gap-3 p-4 border-b border-brand-gold/[0.08] flex-wrap md:px-6">
          <input 
            className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full sm:w-64" 
            placeholder="Search files..." 
            value={search} 
            onChange={function (e) { setSearch(e.target.value); }} 
          />
          <select 
            className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full sm:w-64"
            value={selUmoor || ""} 
            onChange={function (e) { setSelUmoor(e.target.value || null); }}
          >
            <option value="" className="bg-brand-panel">All Umoor Departments</option>
            {UMOOR_TYPES.map(function (u) { return <option key={u} value={u} className="bg-brand-panel">{u}</option>; })}
          </select>
          <button className="inline-flex items-center justify-center rounded-lg p-2 text-brand-muted hover:text-brand-gold bg-transparent border-0 cursor-pointer transition-colors sm:ml-auto" onClick={loadAll}>
            {loading ? <Spinner /> : " "}
          </button>
        </div>

        {/* Content Matrix View */}
        {loading ? (
          <div className="flex items-center justify-center p-16 gap-3 text-sm text-brand-muted">
            <Spinner /> Loading
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <div className="text-4xl opacity-40 mb-3"> </div>
            <div className="text-sm">No files recorded matching selected query parameters</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-brand-gold/10 text-[10px] uppercase tracking-wider text-brand-muted bg-brand-panel/30">
                  <th className="px-5 py-3 font-medium">File No.</th>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Umoor</th>
                  <th className="px-5 py-3 font-medium">Year</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Due Date</th>
                  <th className="px-5 py-3 font-medium">Attachments</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredFiles.map(function (f) {
                  var atts = getFileAtts(f.id);
                  return (
                    <tr 
                      key={f.id} 
                      className="cursor-pointer transition-colors hover:bg-brand-gold/[0.05]" 
                      onClick={function () { setFilePreview(f); }}
                    >
                      <td className="px-5 py-3.5 align-middle"><span className="file-no-token">{f.file_no}</span></td>
                      <td className="px-5 py-3.5 align-middle font-medium text-brand-text">{f.title}</td>
                      <td className="px-5 py-3.5 align-middle text-xs text-gray-400">{f.umoor_type}</td>
                      <td className="px-5 py-3.5 align-middle text-sm">{f.year}</td>
                      <td className="px-5 py-3.5 align-middle text-xs text-brand-muted">{f.date}</td>
                      <td className="px-5 py-3.5 align-middle">
                        {f.due_date ? (function () {
                          var d = new Date(f.due_date); var t = new Date(); t.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
                          var diff = (d - t) / (1000 * 60 * 60 * 24);
                          var cls = diff < 0 ? "bg-brand-danger/10 text-brand-danger border-brand-danger/20" : diff <= 7 ? "bg-brand-warning/10 text-brand-warning border-brand-warning/20" : "bg-white/[0.02] border-brand-gold/15 text-brand-text";
                          return <span className={"inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium border " + cls}>{f.due_date}</span>;
                        })() : <span className="text-gray-700 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        {atts.length > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-brand-gold/10 text-brand-gold border border-brand-gold/20 rounded-full px-2 py-0.5 text-[11px]">
                             {atts.length}
                          </span>
                        ) : <span className="text-gray-700 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 align-middle">
                        <span className={"inline-block rounded-full px-2.5 py-0.5 text-xs font-medium border " + 
                          ((f.status || "").toLowerCase() === "active" ? "badge-active" : (f.status || "").toLowerCase() === "closed" ? "badge-inactive" : "bg-brand-warning/10 text-brand-warning border-brand-warning/20")}>
                          {f.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 align-middle" onClick={function (e) { e.stopPropagation(); }}>
                        <div className="action-column">
                          {canEdit && <button className="btn-ghost px-2.5 py-1 text-xs rounded-md" onClick={function () { openModal("file", "edit", f); }}>Edit</button>}
                          {canDelete && <button className="btn-danger rounded-md" onClick={function () { deleteRecord("file", f.id); }}>Delete</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}