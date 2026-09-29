import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import ResourceList from "./pages/ResourceList";
import Sidebar, { type Page } from "./components/Sidebar";
import Topbar from "./components/Topbar";

export default function App() {
  const [activePage,setActivePage]=useState<Page>("Dashboard");
  const [isAuthenticated,setIsAuthenticated]=useState(Boolean(localStorage.getItem("access_token")));
  useEffect(()=>{if(!isAuthenticated)return;},[isAuthenticated]);

  if(!isAuthenticated) return <Login onLogin={()=>setIsAuthenticated(true)}/>;

  function logout(){localStorage.removeItem("access_token");localStorage.removeItem("refresh_token");setIsAuthenticated(false)}

  return <div className="flex min-h-screen bg-[#f5f7fb] text-slate-800">
    <Sidebar activePage={activePage} onNavigate={setActivePage}/>
    <main className="min-w-0 flex-1"><Topbar onLogout={logout}/><section className="p-5 sm:p-8">
      {activePage==="Dashboard"&&<Dashboard/>}
      {activePage==="Employees"&&<Employees/>}
      {activePage==="Attendance"&&<Attendance/>}
      {activePage==="Leave"&&<Leave/>}
      {activePage==="Departments"&&<ResourceList title="Departments" subtitle="Organization departments" endpoint="departments" kind="resource"/>}
      {activePage==="Designations"&&<ResourceList title="Designations" subtitle="Employee designations" endpoint="designations" kind="resource"/>}
      {activePage==="Shifts"&&<ResourceList title="Shifts" subtitle="Configured employee shifts" endpoint="shifts" kind="shift"/>}
    </section></main>
  </div>
}
