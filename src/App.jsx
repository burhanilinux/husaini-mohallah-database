import "./App.css"; 
import { AppProvider, useAppContext } from "./context/AppContext.jsx"; 
import { Spinner } from "./components/Shared.jsx"; 
import { LoginPage } from "./components/LoginPage.jsx"; 
import { Sidebar } from "./components/Sidebar.jsx"; 
import { IEModal } from "./components/IEModal.jsx"; 
import { Dashboard } from "./pages/Dashboard.jsx"; 
import { FilesPage } from "./pages/FilesPage.jsx"; 
import { MuminPage } from "./pages/MuminPage.jsx"; 
import { SabilPage } from "./pages/SabilPage.jsx"; 
import { MasoolPage } from "./pages/MasoolPage.jsx"; 
import { ReportsPage } from "./pages/ReportsPage.jsx"; 
import { ActivityPage } from "./pages/ActivityPage.jsx"; 
import { UsersPage } from "./pages/UsersPage.jsx"; 
import { MuminModal } from "./modals/MuminModal.jsx"; 
import { FileModal } from "./modals/FileModal.jsx"; 
import { SectorModal } from "./modals/SectorModal.jsx"; 
import { SubSectorModal } from "./modals/SubSectorModal.jsx"; 
import { TrashModal } from "./modals/TrashModal.jsx"; 
import { MuminPreview } from "./modals/MuminPreview.jsx"; 
import { FilePreview } from "./modals/FilePreview.jsx"; 
import { Lightbox } from "./modals/Lightbox.jsx"; 

function ActivePage() {   
  var ctx = useAppContext();   
  switch (ctx.page) {     
    case "dashboard": return <Dashboard />;     
    case "files":     return <FilesPage />;     
    case "mumin":     return <MuminPage />;     
    case "sabil":     return <SabilPage />;     
    case "masool":    return <MasoolPage />;     
    case "reports":   return <ReportsPage />;     
    case "activity":  return <ActivityPage />;     
    case "users":     return <UsersPage />;     
    default:          return <Dashboard />;   
  } 
} 

function AppShell() {   
  var ctx = useAppContext();   
  if (ctx.authLoading) {     
    return (       
      <div className="min-h-screen flex items-center justify-center bg-brand-bg text-brand-muted gap-3 text-sm">         
        <Spinner /> Loading       
      </div>     
    );   
  }   
  if (!ctx.session) {     
    return <LoginPage onLogin={ctx.handleLogin} />;   
  }   
  return (     
    <div className="flex min-h-screen bg-brand-bg text-brand-text">       
      <Sidebar />       
      <main className="flex-1 w-full">         
        {ctx.dbError && (           
          <div className="mx-6 mt-6 bg-brand-danger/8 border border-brand-danger/20 rounded-xl p-4 text-brand-danger text-sm flex items-center justify-between">               
            <span>⚠️ {ctx.dbError}</span>             
            <button className="btn-ghost text-xs px-2.5 py-1 rounded-md" onClick={ctx.loadAll}>Retry</button>           
          </div>         )}         
        <ActivePage />       
      </main>       
      
      {/* Structural Forms Modals Layer */}       
      <MuminModal />       
      <FileModal />       
      <SectorModal />       
      <SubSectorModal />       
      <TrashModal />       
      
      {/* Import / Export Panel Overrides */}       
      {ctx.ieModal && (         
        <IEModal           
          onClose={function () { ctx.setIeModal(false); }}           
          muminData={ctx.muminData}           
          filesData={ctx.filesData}           
          onImportMumin={ctx.handleImportMumin}           
          onImportFiles={ctx.handleImportFiles}           
          importing={ctx.importing}         
        />       
      )}       
      
      {/* Detail Previews Drawer Layer */}       
      <MuminPreview />       
      <FilePreview />       
      <Lightbox />       
      
      {/* App Global Reactive Toast Alert */}       
      {ctx.toast && (         
        <div className={"fixed bottom-6 right-6 z-50 rounded-xl px-5 py-3.5 text-sm shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-right duration-300 " +            
          (ctx.toast.type === "success" ? "bg-brand-panel border border-brand-success/30 text-brand-success" : "bg-brand-panel border border-brand-danger/30 text-brand-danger")}>           
          <span>{ctx.toast.type === "success" ? "✅" : "❌"}</span> {ctx.toast.msg}         
        </div>       
      )}     
    </div>   
  ); 
} 

export default function App() {   
  return (     
    <AppProvider>       
      <AppShell />     
    </AppProvider>   
  ); 
}