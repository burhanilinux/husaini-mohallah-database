import "./App.css";
import { AppProvider, useAppContext } from "./context/AppContext.jsx";
import { Spinner } from "./components/Shared.jsx";
import { LoginPage } from "./components/LoginPage.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { IEModal } from "./components/IEModal.jsx";

import { Dashboard } from "./pages/Dashboard.jsx";
import { MuminPage } from "./pages/MuminPage.jsx";
import { FamilyPage } from "./pages/FamilyPage.jsx";
import { DataQualityPage } from "./pages/DataQualityPage.jsx";
import { AdvancedSearchPage } from "./pages/AdvancedSearchPage.jsx";
import { SabilPage } from "./pages/SabilPage.jsx";
import { MasoolPage } from "./pages/MasoolPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";
import { ActivityPage } from "./pages/ActivityPage.jsx";
import { UsersPage } from "./pages/UsersPage.jsx";

import { MuminModal } from "./modals/MuminModal.jsx";
import { SectorModal } from "./modals/SectorModal.jsx";
import { SubSectorModal } from "./modals/SubSectorModal.jsx";
import { TrashModal } from "./modals/TrashModal.jsx";
import { MuminPreview } from "./modals/MuminPreview.jsx";
import { Lightbox } from "./modals/Lightbox.jsx";

function ActivePage() {
  var ctx = useAppContext();
  switch (ctx.page) {
    case "dashboard": return <Dashboard />;
    case "mumin": return <MuminPage />;
    case "families": return <FamilyPage />;
    case "data-quality": return <DataQualityPage />;
    case "advanced-search": return <AdvancedSearchPage />;
    case "sabil": return <SabilPage />;
    case "masool": return <MasoolPage />;
    case "reports": return <ReportsPage />;
    case "activity": return <ActivityPage />;
    case "users": return <UsersPage />;
    default: return <Dashboard />;
  }
}

function AppShell() {
  var ctx = useAppContext();
  if (ctx.authLoading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1117", color: "#6b7280", gap: 12, fontSize: 14 }}><Spinner /> Loading…</div>;
  if (!ctx.session) return <LoginPage onLogin={ctx.handleLogin} />;
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        {ctx.dbError && <div className="err-banner">⚠ {ctx.dbError}<button className="btn btn-ghost btn-sm" onClick={ctx.loadAll} style={{ marginLeft: 8 }}>Retry</button></div>}
        <ActivePage />
      </main>
      <MuminModal />
      <SectorModal />
      <SubSectorModal />
      {ctx.ieModal && <IEModal onClose={function () { ctx.setIeModal(false); }} muminData={ctx.muminData} filesData={[]} onImportMumin={ctx.handleImportMumin} onImportFiles={function () {}} importing={ctx.importing} />}
      <TrashModal />
      <MuminPreview />
      <Lightbox />
      {ctx.toast && <div className={"toast toast-" + ctx.toast.type}>{ctx.toast.type === "success" ? "✓" : "⚠"} {ctx.toast.msg}</div>}
    </div>
  );
}

export default function App() {
  return <AppProvider><AppShell /></AppProvider>;
}
