import { useAppContext } from "../context/AppContext.jsx";
import { Spinner } from "../components/Shared.jsx";
import { getMuminAge } from "../lib/utils.js";

export function MuminPage() {
  var ctx = useAppContext();
  var filteredMumin = ctx.filteredMumin, loading = ctx.loading;
  var canEdit = ctx.canEdit, canDelete = ctx.canDelete;
  var openModal = ctx.openModal, loadAll = ctx.loadAll;
  var search = ctx.search, setSearch = ctx.setSearch;
  var selSector = ctx.selSector, setSelSector = ctx.setSelSector;
  var { areaSectors, setMuminPreview, deleteRecord } = ctx;

  return (
    <div className="w-full flex-1 p-6 md:p-9 lg:ml-[260px]">
      {/* Header Block */}
      <div className="mb-8">
        <div className="font-sans text-2xl font-bold text-brand-gold sm:text-[28px]">Mumin Data</div>
        <div className="mt-1 text-xs text-brand-muted sm:text-[13px]">Registered community members database records</div>
      </div>

      <div className="bg-white/[0.02] border border-brand-gold/10 rounded-xl overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-gold/10 flex-wrap gap-2">
          <span className="text-sm font-semibold text-brand-text">Active Registrations List ({filteredMumin.length})</span>
          <div className="flex items-center gap-2.5">
            <button className="inline-flex items-center justify-center rounded-lg p-2 text-brand-muted hover:text-brand-gold bg-transparent border-0 cursor-pointer transition-colors" onClick={loadAll}>
              {loading ? <Spinner /> : " "}
            </button>
            {canEdit && <button className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm" onClick={function () { openModal("mumin", "add"); }}>+ Add Mumin</button>}
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-brand-gold/[0.08] flex-wrap md:px-6">
          <input 
            className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full sm:w-64" 
            placeholder="Search by name or ITS..." 
            value={search} 
            onChange={function (e) { setSearch(e.target.value); }} 
          />
          <select 
            className="bg-white/[0.04] border border-brand-gold/15 text-brand-text rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:border-brand-gold/40 w-full sm:w-48"
            value={selSector || ""} 
            onChange={function (e) { setSelSector(e.target.value || null); }}
          >
            <option value="" className="bg-brand-panel">All Sectors</option>
            {areaSectors.map(function (s) { return <option key={s} value={s} className="bg-brand-panel">{s}</option>; })}
          </select>
        </div>

        {/* Data View Grid Matrix */}
        {loading ? (
          <div className="flex items-center justify-center p-16 gap-3 text-sm text-brand-muted">
            <Spinner /> Loading
          </div>
        ) : filteredMumin.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <div className="text-4xl opacity-40 mb-3"> </div>
            <div className="text-sm">No member records found matching filters</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-brand-gold/10 text-[10px] uppercase tracking-wider text-brand-muted">
                  <th className="px-5 py-3 text-left font-medium">Avatar</th>
                  <th className="px-5 py-3 text-left font-medium">ITS No.</th>
                  <th className="px-5 py-3 text-left font-medium">Name</th>
                  <th className="px-5 py-3 text-left font-medium">Age</th>
                  <th className="px-5 py-3 text-left font-medium">Gender</th>
                  <th className="px-5 py-3 text-left font-medium">Phone</th>
                  <th className="px-5 py-3 text-left font-medium">Sector</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredMumin.map(function (m) {
                  var genClass = (m.gender || "").toLowerCase() === "male" ? "badge-male" : "badge-female";
                  return (
                    <tr key={m.id} className="cursor-pointer transition-colors hover:bg-brand-gold/[0.05]" onClick={function () { setMuminPreview(m); }}>
                      <td className="px-5 py-3.5 align-middle">
                        <div className="w-[30px] h-[30px] rounded-full overflow-hidden bg-brand-gold/15 border border-brand-gold/25 flex items-center justify-center text-xs font-semibold text-brand-gold">
                          {m.photo_url ? <img src={m.photo_url} alt="" className="w-full h-full object-cover" /> : (m.name ? m.name.charAt(0).toUpperCase() : "?")}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-middle file-no-token">{m.its_number}</td>
                      <td className="px-5 py-3.5 align-middle font-medium text-brand-text">{m.name}</td>
                      <td className="px-5 py-3.5 align-middle text-sm">{getMuminAge(m)}</td>
                      <td className="px-5 py-3.5 align-middle"><span className={"inline-block rounded-full px-2 py-0.5 text-xs font-medium border " + genClass}>{m.gender}</span></td>
                      <td className="px-5 py-3.5 align-middle text-xs text-gray-400">{m.phone}</td>
                      <td className="px-5 py-3.5 align-middle text-xs text-brand-gold">{m.area_sector || "—"}</td>
                      <td className="px-5 py-3.5 align-middle"><span className={"inline-block rounded-full px-2.5 py-0.5 text-xs font-medium border " + ((m.status || "").toLowerCase() === "active" ? "badge-active" : "badge-inactive")}>{m.status}</span></td>
                      <td className="px-5 py-3.5 align-middle" onClick={function (e) { e.stopPropagation(); }}>
                        <div className="action-column">
                          {canEdit && <button className="btn-ghost px-2.5 py-1 text-xs rounded-md" onClick={function () { openModal("mumin", "edit", m); }}>Edit</button>}
                          {canDelete && <button className="btn-danger rounded-md" onClick={function () { deleteRecord("mumin", m.id); }}>Delete</button>}
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