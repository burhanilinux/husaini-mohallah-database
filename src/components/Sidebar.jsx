import { useAppContext } from "../context/AppContext.jsx";
import { GlobalSearch } from "./GlobalSearch.jsx";

export function Sidebar() {
  var ctx = useAppContext();
  var page = ctx.page, setPage = ctx.setPage;
  var setSearch = ctx.setSearch, setSelUmoor = ctx.setSelUmoor;
  var setIeModal = ctx.setIeModal, setTrashModal = ctx.setTrashModal, loadTrash = ctx.loadTrash;
  var downloadFullBackup = ctx.downloadFullBackup, restoreFromBackup = ctx.restoreFromBackup;
  var session = ctx.session, handleSignOut = ctx.handleSignOut;

  var navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "files", icon: "📁", label: "Umoor Files" },
    { id: "mumin", icon: "👤", label: "Mumin Data" },
    { id: "sabil", icon: "🏠", label: "Sabil Groups" },
    { id: "masool", icon: "🗺️", label: "Masool" },
    { id: "reports", icon: "🖨️", label: "Reports" },
    { id: "activity", icon: "⏳", label: "Activity Log" },
  ];

  return (
    <aside className="w-full md:w-[260px] md:shrink-0 bg-gradient-to-b from-brand-panel to-brand-bg border-b md:border-b-0 md:border-r border-brand-gold/15 flex flex-col md:fixed md:h-screen overflow-y-auto z-30">
      {/* Brand Logo Header */}
      <div className="px-6 pt-7 pb-5 border-b border-brand-gold/[0.12]">
        <div className="font-arabic text-[22px] text-brand-gold leading-tight">حسيني محله</div>
        <div className="text-[10px] uppercase tracking-[3px] text-brand-muted mt-1 font-semibold">Husaini Mohallah Database</div>
        <div className="inline-flex items-center gap-1 bg-brand-success/10 text-brand-success border border-brand-success/20 rounded-full px-2 py-0.5 text-[10px] mt-2 font-medium">☁ Supabase Cloud</div>
      </div>

      {/* Main App Navigation Cluster */}
      <nav className="px-3 py-4 flex-1 flex flex-col gap-0.5">
        <div className="text-[9px] uppercase tracking-[3px] text-gray-500 px-3 pt-2.5 pb-1.5 font-bold">Main</div>
        {navItems.map(function (n) {
          var isActive = page === n.id;
          return (
            <div
              key={n.id} 
              className={"flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors border " + 
                (isActive ? "bg-brand-gold/10 text-brand-gold border-brand-gold/20 font-medium" : "text-brand-muted border-transparent hover:bg-brand-gold/[0.06] hover:text-brand-text")}
              onClick={function () { setPage(n.id); setSearch(""); setSelUmoor(null); }}
            >
              <span className="text-base shrink-0">{n.icon}</span> {n.label}
            </div>
          );
        })}

        <div className="h-px bg-brand-gold/5 my-3 mx-2" />

        {/* Workspace Operations Action Buttons */}
        <div className="flex flex-col gap-0.5">
          <div className="text-[9px] uppercase tracking-[3px] text-gray-500 px-3 pb-1.5 font-bold">System</div>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs text-brand-gold-lite border border-brand-gold/10 bg-brand-gold/[0.02] hover:bg-brand-gold/[0.08]" onClick={function () { setIeModal(true); }}>
            <span>📥</span> Import / Export Data
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs text-brand-muted hover:text-brand-text transition-colors" onClick={function () { setTrashModal(true); loadTrash(); }}>
            <span>🗑️</span> System Garbage Trash
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs text-brand-muted hover:text-brand-text transition-colors" onClick={downloadFullBackup}>
            <span>💾</span> Backup Local Dataset
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs text-brand-muted hover:text-brand-text transition-colors" onClick={function () { document.getElementById("restore-file-input").click(); }}>
            <span>🔄</span> Restore Dataset File
          </div>
        </div>

        <input
          id="restore-file-input" type="file" accept=".json" className="hidden"
          onChange={function (e) { if (e.target.files[0]) restoreFromBackup(e.target.files[0]); e.target.value = ""; }}
        />
        
        <div className="mt-4">
          <GlobalSearch />
        </div>
      </nav>

      {/* User Session Box Footer Block */}
      <div className="mx-3 my-4 bg-brand-gold/5 border border-brand-gold/10 rounded-xl p-3.5 flex flex-col gap-1">
        <div className="text-[10px] text-brand-gold uppercase tracking-wide font-bold">Session Profile</div>
        <div className="text-xs text-brand-muted truncate" title={session && session.user && session.user.email}>
          {session && session.user && session.user.email}
        </div>
        <button className="w-full mt-2 bg-transparent border border-brand-danger/20 text-brand-danger rounded-md py-1.5 text-xs font-medium cursor-pointer transition-colors hover:bg-brand-danger/10" onClick={handleSignOut}>
          Sign Out Workspace
        </button>
      </div>
    </aside>
  );
}