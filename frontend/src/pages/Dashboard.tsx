import { useEffect, useMemo, useState } from "react";
import { Users, CalendarCheck, CalendarDays, Clock3 } from "lucide-react";
import { getEmployees, type Employee } from "../api/employees";
import { getAttendance, type Attendance } from "../api/attendance";
import { getLeaves, type Leave } from "../api/leaves";
import { getDepartments, type Department } from "../api/departments";
import { getDesignations, type Designation } from "../api/designations";
import { getShifts, type Shift } from "../api/shifts";
import StatCard from "../components/StatCard";

function localDate(d: Date){return d.toISOString().slice(0,10)}
export default function Dashboard(){
  const [employees,setEmployees]=useState<Employee[]>([]);
  const [attendance,setAttendance]=useState<Attendance[]>([]);
  const [leaves,setLeaves]=useState<Leave[]>([]);
  const [departments,setDepartments]=useState<Department[]>([]);
  const [designations,setDesignations]=useState<Designation[]>([]);
  const [shifts,setShifts]=useState<Shift[]>([]);
  const [error,setError]=useState("");
  useEffect(()=>{(async()=>{try{const now=new Date();const end=localDate(now);const start=new Date(now);start.setDate(now.getDate()-6);const [e,a,l,d,des,s]=await Promise.all([getEmployees(),getAttendance({start_date:localDate(start),end_date:end}),getLeaves(),getDepartments(),getDesignations(),getShifts()]);setEmployees(e);setAttendance(a);setLeaves(l);setDepartments(d);setDesignations(des);setShifts(s)}catch(err:any){setError(err?.response?.data?.detail??"Some dashboard data could not be loaded.")}})()},[]);
  const today=localDate(new Date());
  const todayRecords=attendance.filter(a=>a.attendance_date===today);
  const present=todayRecords.filter(a=>a.check_in).length;
  const late=todayRecords.filter(a=>a.status==="late").length;
  const onLeave=leaves.filter(l=>l.status==="approved"&&l.start_date<=today&&l.end_date>=today).length;
  const active=employees.filter(e=>e.employment_status==="active").length;
  const deptMap=useMemo(()=>new Map(departments.map(d=>[d.id,d.name])),[departments]);
  const desMap=useMemo(()=>new Map(designations.map(d=>[d.id,d.name])),[designations]);
  const shiftMap=useMemo(()=>new Map(shifts.map(s=>[s.id,s.name])),[shifts]);
  const bars=Array.from({length:7},(_,idx)=>{const d=new Date();d.setDate(d.getDate()-(6-idx));const key=localDate(d);return {label:d.toLocaleDateString(undefined,{weekday:"short"}),value:attendance.filter(a=>a.attendance_date===key).length}});
  const max=Math.max(...bars.map(b=>b.value),1);
  return <div className="space-y-8">
    <div><p className="text-sm font-medium text-indigo-600">{new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</p><h2 className="mt-1 text-3xl font-bold tracking-tight">Good morning, Admin 👋</h2><p className="mt-2 text-sm text-slate-500">Live data from your HRM backend.</p></div>
    {error&&<div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard title="Total Employees" value={String(employees.length)} subtitle={`${active} active`} icon={<Users size={21}/>}/><StatCard title="Present Today" value={String(present)} subtitle={`${todayRecords.length} attendance records`} icon={<CalendarCheck size={21}/>}/><StatCard title="On Leave" value={String(onLeave)} subtitle="Approved today" icon={<CalendarDays size={21}/>}/><StatCard title="Late Today" value={String(late)} subtitle="Late check-ins" icon={<Clock3 size={21}/>}/></div>
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2"><div><h3 className="font-semibold">Attendance Overview</h3><p className="mt-1 text-xs text-slate-400">Real attendance records for the last 7 days</p></div><div className="mt-8 flex h-56 items-end justify-between gap-3">{bars.map(b=><div key={b.label} className="flex flex-1 flex-col items-center gap-2"><div className="flex h-44 w-full items-end justify-center rounded-lg bg-slate-50"><div className="w-2/3 rounded-t-lg bg-indigo-500" style={{height:`${Math.max((b.value/max)*100,b.value?8:2)}%`}}/></div><span className="text-xs text-slate-400">{b.label}</span></div>)}</div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6"><h3 className="font-semibold">Organization</h3><p className="mt-1 text-xs text-slate-400">Current configuration</p><div className="mt-6 space-y-4"><Metric label="Departments" value={departments.length}/><Metric label="Designations" value={designations.length}/><Metric label="Shifts" value={shifts.length}/></div></div>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-6"><h3 className="font-semibold">Recent Employees</h3><p className="mt-1 text-xs text-slate-400">Live employee records</p></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400"><tr>{["Employee","Department","Designation","Shift","Status"].map(h=><th key={h} className="px-6 py-4">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{employees.slice(0,5).map(e=><tr key={e.id}><td className="px-6 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">{`${e.first_name[0]??""}${e.last_name?.[0]??""}`.toUpperCase()}</div><div><p className="text-sm font-semibold">{`${e.first_name} ${e.last_name??""}`.trim()}</p><p className="text-xs text-slate-400">{e.email??"No email"}</p></div></div></td><td className="px-6 py-4 text-sm">{deptMap.get(e.department_id??"")??"—"}</td><td className="px-6 py-4 text-sm">{desMap.get(e.designation_id??"")??"—"}</td><td className="px-6 py-4 text-sm">{shiftMap.get(e.shift_id??"")??"—"}</td><td className="px-6 py-4"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">{e.employment_status}</span></td></tr>)}</tbody></table></div></div>
  </div>
}
function Metric({label,value}:{label:string;value:number}){return <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"><span className="text-sm text-slate-500">{label}</span><span className="text-lg font-bold">{value}</span></div>}
