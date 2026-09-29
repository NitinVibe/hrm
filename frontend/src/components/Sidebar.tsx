import type { ComponentType } from "react";
import {
  LayoutDashboard, Users, CalendarCheck, CalendarDays,
  Building2, BriefcaseBusiness, Clock3, Settings,
} from "lucide-react";

export type Page = "Dashboard" | "Employees" | "Attendance" | "Leave" | "Departments" | "Designations" | "Shifts";

interface Props {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const navigation: Array<{ name: Page; icon: ComponentType<{ size?: number }> }> = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Employees", icon: Users },
  { name: "Attendance", icon: CalendarCheck },
  { name: "Leave", icon: CalendarDays },
  { name: "Departments", icon: Building2 },
  { name: "Designations", icon: BriefcaseBusiness },
  { name: "Shifts", icon: Clock3 },
];

export default function Sidebar({ activePage, onNavigate }: Props) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-20 items-center border-b border-slate-100 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">H</div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">HRM System</h1>
            <p className="text-xs text-slate-400">Human Resource Management</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Main Menu</p>
        {navigation.map(({ name, icon: Icon }) => (
          <button key={name} onClick={() => onNavigate(name)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
              activePage === name ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}>
            <Icon size={19} />
            {name}
          </button>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-4">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500 hover:bg-slate-50">
          <Settings size={19} /> Settings
        </button>
      </div>
    </aside>
  );
}
