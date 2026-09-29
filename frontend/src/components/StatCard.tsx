import type { ReactNode } from "react";

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
}

export default function StatCard({ title, value, subtitle, icon }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</div>
      <p className="mt-5 text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
