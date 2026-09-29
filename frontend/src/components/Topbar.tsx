import { Bell, ChevronDown, UserRound } from "lucide-react";

interface Props {
  email?: string;
  onLogout: () => void;
}

export default function Topbar({ email, onLogout }: Props) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
      <div className="hidden sm:block">
        <input placeholder="Search..." className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
      </div>
      <div className="flex items-center gap-4">
        <button className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-50">
          <Bell size={20} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="h-8 w-px bg-slate-200" />
        <button onClick={onLogout} title="Sign out" className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-slate-50">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><UserRound size={18} /></div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold">Admin User</p>
            <p className="text-xs text-slate-400">{email ?? "Administrator"}</p>
          </div>
          <ChevronDown size={16} className="text-slate-400" />
        </button>
      </div>
    </header>
  );
}
