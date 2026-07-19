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
    { id: "dashboard", icon: "◈", label: "Dashboard" },
    { id: "files", icon: "🗂", label: "Umoor Files" },
    { id: "mumin", icon: "👤", label: "Mumin Data" },
    { id: "sabil", icon: "🏠", label: "Sabil Groups" },
    { id: "masool", icon: "🧭", label: "Masool" },
    { id: "reports", icon: "📄", label: "Reports" },
    { id: "activity", icon: "🕘", label: "Activity Log" },
    null, // Users tab intentionally hidden from navigation
  ].filter(Boolean);

  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <div className="sb-arabic">حسيني محلّه</div>
        <div className="sb-sub">Husaini Mohallah · Database</div>
        <div className="cloud-badge">☁ Supabase Cloud</div>
      </div>

      <nav className="nav">
        <div className="nav-lbl">Main</div>
        {navItems.map(function (n) {
          return (
            <div
              key={n.id} className={"nav-item" + (page === n.id ? " active" : "")}
              onClick={function () { setPage(n.id); setSearch(""); setSelUmoor(null); }}
            >
              <span>{n.icon}</span> {n.label}
            </div>
          );
        })}

        <div
          className="nav-item" style={{ color: "#c9a84c", borderColor: "rgba(201,168,76,.15)", marginTop: 4 }}
          onClick={function () { setIeModal(true); }}
        >
          <span>⇅</span> Import / Export
        </div>
        <div
          className="nav-item" style={{ color: "#9ca3af", marginTop: 2 }}
          onClick={function () { setTrashModal(true); loadTrash(); }}
        >
          <span>🗑</span> Trash
        </div>
        <div
          className="nav-item" style={{ color: "#9ca3af", marginTop: 2 }}
          onClick={function () { downloadFullBackup(); }}
        >
          <span>💾</span> Backup All Data
        </div>
        <div
          className="nav-item" style={{ color: "#9ca3af", marginTop: 2 }}
          onClick={function () { document.getElementById("restore-file-input").click(); }}
        >
          <span>📤</span> Restore Backup
        </div>
        <input
          id="restore-file-input" type="file" accept=".json" style={{ display: "none" }}
          onChange={function (e) { if (e.target.files[0]) restoreFromBackup(e.target.files[0]); e.target.value = ""; }}
        />

        <GlobalSearch />
      </nav>

      <div className="user-box">
        <div className="user-role">● Signed In</div>
        <div className="user-email">{session && session.user && session.user.email}</div>
        <button className="signout-btn" onClick={handleSignOut}>Sign Out</button>
      </div>
      <div className="sb-footer">Husaini Mohallah © 2026 · Developed by Juzer Dana</div>
    </aside>
  );
}
