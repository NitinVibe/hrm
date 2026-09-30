import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Building2,
  BriefcaseBusiness,
  CalendarCheck,
  Clock3,
  CalendarDays,
  CreditCard,
  Target,
  UserPlus,
  FileText,
  Megaphone,
  History,
  UserCheck,
  ShieldCheck,
} from "lucide-react";

export type Page =
  | "Dashboard"
  | "Employees"
  | "Attendance"
  | "Leave"
  | "Branches"
  | "Departments"
  | "Designations"
  | "Shifts"
  | "Payroll"
  | "Performance"
  | "Recruitment"
  | "Documents"
  | "Announcements"
  | "Audit Logs"
  | "Self Service"
  | "Manager Portal";

interface Props {
  activePage: Page;
  role?: string | null;
  onNavigate: (page: Page) => void;
}

interface NavSection {
  title: string;
  items: Array<{ name: Page; icon: ComponentType<{ size?: number; className?: string }> }>;
}

const allNavSections: NavSection[] = [
  {
    title: "Overview",
    items: [{ name: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Portals",
    items: [
      { name: "Self Service", icon: UserCheck },
      { name: "Manager Portal", icon: ShieldCheck },
    ],
  },
  {
    title: "Core HR",
    items: [
      { name: "Employees", icon: Users },
      { name: "Branches", icon: MapPin },
      { name: "Departments", icon: Building2 },
      { name: "Designations", icon: BriefcaseBusiness },
    ],
  },
  {
    title: "Time & Attendance",
    items: [
      { name: "Attendance", icon: CalendarCheck },
      { name: "Shifts", icon: Clock3 },
      { name: "Leave", icon: CalendarDays },
    ],
  },
  {
    title: "Talent & Finance",
    items: [
      { name: "Payroll", icon: CreditCard },
      { name: "Performance", icon: Target },
      { name: "Recruitment", icon: UserPlus },
    ],
  },
  {
    title: "Enterprise",
    items: [
      { name: "Documents", icon: FileText },
      { name: "Announcements", icon: Megaphone },
      { name: "Audit Logs", icon: History },
    ],
  },
];

export default function Sidebar({ activePage, role, onNavigate }: Props) {
  const currentRole = (role || "ORG_ADMIN").toUpperCase();

  // Filter sections by role
  let visibleSections = allNavSections;
  if (currentRole === "EMPLOYEE") {
    visibleSections = [
      {
        title: "Employee Portal",
        items: [{ name: "Self Service", icon: UserCheck }],
      },
      {
        title: "Company",
        items: [
          { name: "Announcements", icon: Megaphone },
          { name: "Documents", icon: FileText },
        ],
      },
    ];
  } else if (currentRole === "MANAGER") {
    visibleSections = [
      {
        title: "Management",
        items: [
          { name: "Manager Portal", icon: ShieldCheck },
          { name: "Self Service", icon: UserCheck },
        ],
      },
      {
        title: "Team Tracking",
        items: [
          { name: "Attendance", icon: CalendarCheck },
          { name: "Leave", icon: CalendarDays },
          { name: "Shifts", icon: Clock3 },
          { name: "Performance", icon: Target },
        ],
      },
      {
        title: "Company",
        items: [
          { name: "Announcements", icon: Megaphone },
          { name: "Documents", icon: FileText },
        ],
      },
    ];
  }

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col h-screen sticky top-0 z-30">
      <div className="flex h-20 items-center border-b border-slate-100 px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-sm shadow-indigo-200">
            H
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">HRM Enterprise</h1>
            <p className="text-[11px] text-slate-400 font-medium">SaaS Cloud Suite</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto space-y-4 p-4 scrollbar-thin">
        {visibleSections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ name, icon: Icon }) => {
                const isActive = activePage === name;
                return (
                  <button
                    key={name}
                    onClick={() => onNavigate(name)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "bg-indigo-50 text-indigo-600 shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={17} className={isActive ? "text-indigo-600" : "text-slate-400"} />
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-3 shrink-0">
        <div className="rounded-xl bg-slate-50 p-2.5 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-700 capitalize">{currentRole.replace("_", " ")}</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>
      </div>
    </aside>
  );
}
