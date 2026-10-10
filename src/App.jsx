import { lazy, Suspense, useEffect, useState } from "react";
import "./App.css";
import "./mobile.css";
import "./print.css";
import { AppProvider, useAppContext } from "./context/AppContext.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { Spinner } from "./components/Shared.jsx";
import { LoginPage } from "./components/LoginPage.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
const IEModal = lazy(() => import("./components/IEModal.jsx").then((module) => ({ default: module.IEModal })));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx").then((module) => ({ default: module.Dashboard })));
const StatisticsPage = lazy(() => import("./pages/StatisticsPage.jsx").then((module) => ({ default: module.StatisticsPage })));
const MuminPage = lazy(() => import("./pages/MuminPage.jsx").then((module) => ({ default: module.MuminPage })));
const DataQualityPage = lazy(() => import("./pages/DataQualityPage.jsx").then((module) => ({ default: module.DataQualityPage })));
const AdvancedSearchPage = lazy(() => import("./pages/AdvancedSearchPage.jsx").then((module) => ({ default: module.AdvancedSearchPage })));
const SabilPage = lazy(() => import("./pages/SabilPage.jsx").then((module) => ({ default: module.SabilPage })));
const RelationshipManagerPage = lazy(() => import("./pages/SabilPage.jsx").then((module) => ({ default: module.RelationshipManagerPage })));
const MasoolPage = lazy(() => import("./pages/MasoolPage.jsx").then((module) => ({ default: module.MasoolPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage.jsx").then((module) => ({ default: module.ReportsPage })));
const ReportBuilderPage = lazy(() => import("./pages/ReportBuilderPage.jsx").then((module) => ({ default: module.ReportBuilderPage })));
const ActivityPage = lazy(() => import("./pages/ActivityPage.jsx").then((module) => ({ default: module.ActivityPage })));
const UsersPage = lazy(() => import("./pages/UsersPage.jsx").then((module) => ({ default: module.UsersPage })));
const MohallahSurveyPage = lazy(() => import("./pages/MohallahSurveyPage.jsx").then((module) => ({ default: module.MohallahSurveyPage })));
const SurveyManagementPage = lazy(() => import("./pages/SurveyManagementPage.jsx").then((module) => ({ default: module.SurveyManagementPage })));
import { MuminModal } from "./modals/MuminModal.jsx";
import { SectorModal } from "./modals/SectorModal.jsx";
import { SubSectorModal } from "./modals/SubSectorModal.jsx";
import { TrashModal } from "./modals/TrashModal.jsx";
import { MuminPreview } from "./modals/MuminPreview.jsx";
import { Lightbox } from "./modals/Lightbox.jsx";
const ReceptionPage = lazy(() => import("./pages/ReceptionPage.jsx").then((module) => ({ default: module.ReceptionPage })));

function ActivePage() {
  var ctx = useAppContext();
  switch (ctx.page) {
    case "dashboard": return <Dashboard />;
    case "statistics": return <StatisticsPage />;
    case "mumin": return <MuminPage />;
    case "data-quality": return <DataQualityPage />;
    case "advanced-search": return <AdvancedSearchPage />;
    case "sabil": return <SabilPage />;
    case "relationships": return <RelationshipManagerPage />;
    case "masool": return <MasoolPage />;
    case "reports": return <ReportsPage />;
    case "report-builder": return <ReportBuilderPage />;
    case "activity": return <ActivityPage />;
    case "reception": return <ReceptionPage />;
    case "users": return <UsersPage />;
    case "mohallah-survey": return <MohallahSurveyPage />;
    case "survey-management": return <SurveyManagementPage />;
    default: return <Dashboard />;
  }
}
function NetworkStatus(){
  var [online,setOnline]=useState(function(){return navigator.onLine;});
  useEffect(function(){function on(){setOnline(true);}function off(){setOnline(false);}window.addEventListener("online",on);window.addEventListener("offline",off);return function(){window.removeEventListener("online",on);window.removeEventListener("offline",off);};},[]);
  return <div className={"network-status "+(online?"network-online":"network-offline")} role="status"><span className="network-dot"/> {online?"Online":"Offline"}{!online&&<span className="network-hint"> · Changes need an internet connection</span>}</div>;
}

function AppShell() {
  var ctx = useAppContext(), auth = useAuth();
  if (auth.authLoading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0d1117",color:"#6b7280",gap:12,fontSize:14}}><Spinner /> Loading…</div>;
  if (!auth.session) return <LoginPage onLogin={auth.login} />;
  return <div className="layout"><NetworkStatus /><Sidebar /><main className="main">{ctx.dbError && <div className="err-banner">⚠ {ctx.dbError}<button className="btn btn-ghost btn-sm" onClick={ctx.loadAll} style={{marginLeft:8}}>Retry</button></div>}<Suspense fallback={<div className="card" role="status" style={{ padding: 24, color: "#9ca3af" }}>Loading module…</div>}><ActivePage /></Suspense></main><MuminModal /><SectorModal /><SubSectorModal />{ctx.ieModal && <IEModal onClose={function(){ctx.setIeModal(false);}} muminData={ctx.muminData} filesData={[]} onImportMumin={ctx.handleImportMumin} onImportFiles={function(){}} importing={ctx.importing} />}<TrashModal /><MuminPreview /><Lightbox />{ctx.toast && <div className={"toast toast-"+ctx.toast.type}>{ctx.toast.type==="success"?"✓":"⚠"} {ctx.toast.msg}</div>}</div>;
}
export default function App() { return <AuthProvider><AppProvider><AppShell /></AppProvider></AuthProvider>; }
