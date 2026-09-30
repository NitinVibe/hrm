import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import Branches from "./pages/Branches";
import Departments from "./pages/Departments";
import Designations from "./pages/Designations";
import Shifts from "./pages/Shifts";
import Payroll from "./pages/Payroll";
import Performance from "./pages/Performance";
import Recruitment from "./pages/Recruitment";
import Documents from "./pages/Documents";
import Announcements from "./pages/Announcements";
import AuditLogs from "./pages/AuditLogs";
import SelfService from "./pages/SelfService";
import ManagerPortal from "./pages/ManagerPortal";
import Sidebar, { type Page } from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { getUserProfile, type UserProfile } from "./api/auth";

export default function App() {
  const [activePage, setActivePage] = useState<Page>("Dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(localStorage.getItem("access_token")));
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    getUserProfile()
      .then((profile) => {
        setUserProfile(profile);
        // Role-based landing page
        const role = profile.role?.toUpperCase();
        if (role === "EMPLOYEE") {
          setActivePage("Self Service");
        } else if (role === "MANAGER") {
          setActivePage("Manager Portal");
        } else {
          setActivePage("Dashboard");
        }
      })
      .catch(() => {
        // token expired or invalid
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setIsAuthenticated(false);
      });
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Login onLogin={() => setIsAuthenticated(true)} />;

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUserProfile(null);
    setIsAuthenticated(false);
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] text-slate-800">
      <Sidebar activePage={activePage} role={userProfile?.role} onNavigate={setActivePage} />
      <main className="min-w-0 flex-1">
        <Topbar user={userProfile} onNavigate={setActivePage} onLogout={logout} />
        <section className="p-5 sm:p-8">
          {activePage === "Dashboard" && <Dashboard />}
          {activePage === "Employees" && <Employees />}
          {activePage === "Attendance" && <Attendance />}
          {activePage === "Leave" && <Leave />}
          {activePage === "Branches" && <Branches />}
          {activePage === "Departments" && <Departments />}
          {activePage === "Designations" && <Designations />}
          {activePage === "Shifts" && <Shifts />}
          {activePage === "Payroll" && <Payroll />}
          {activePage === "Performance" && <Performance />}
          {activePage === "Recruitment" && <Recruitment />}
          {activePage === "Documents" && <Documents />}
          {activePage === "Announcements" && <Announcements />}
          {activePage === "Audit Logs" && <AuditLogs />}
          {activePage === "Self Service" && <SelfService />}
          {activePage === "Manager Portal" && <ManagerPortal />}
        </section>
      </main>
    </div>
  );
}
