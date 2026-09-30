import { useEffect, useMemo, useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { getAttendance, myCheckIn, myCheckOut, type Attendance as AttendanceRecord } from "../api/attendance";
import { getEmployees, type Employee } from "../api/employees";

function today() { return new Date().toISOString().slice(0, 10); }

export default function Attendance() {
  const [records,setRecords]=useState<AttendanceRecord[]>([]);
  const [employees,setEmployees]=useState<Employee[]>([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [date,setDate]=useState(today());

  async function load() {
    try {
      const [a,e]=await Promise.all([getAttendance({attendance_date:date}),getEmployees()]);
      setRecords(a); setEmployees(e); setError("");
    } catch(err:any) { setError(err?.response?.data?.detail ?? "Failed to load attendance."); }
  }
  useEffect(()=>{void load()},[date]);
  const names=useMemo(()=>new Map(employees.map(e=>[e.id,`${e.first_name} ${e.last_name??""}`.trim()])),[employees]);

  async function checkIn(){setBusy(true);try{await myCheckIn();await load()}catch(err:any){setError(err?.response?.data?.detail??"Check-in failed.")}finally{setBusy(false)}}
  async function checkOut(){setBusy(true);try{await myCheckOut();await load()}catch(err:any){setError(err?.response?.data?.detail??"Check-out failed.")}finally{setBusy(false)}}

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-3xl font-bold">Attendance</h2><p className="mt-1 text-sm text-slate-500">Daily attendance records</p></div><div className="flex gap-2"><button disabled={busy} onClick={()=>void checkIn()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><LogIn size={17}/> My check-in</button><button disabled={busy} onClick={()=>void checkOut()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold"><LogOut size={17}/> My check-out</button></div></div>
    {error&&<div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
    <div className="rounded-2xl border border-slate-200 bg-white p-5"><label className="text-sm font-medium">Date<input type="date" value={date} onChange={e=>setDate(e.target.value)} className="ml-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"/></label></div>
    <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400"><tr>{["Employee","Date","Check in","Check out","Late","Working","Status"].map(x=><th key={x} className="px-5 py-4">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{records.length===0?<tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">No attendance records for this date.</td></tr>:records.map(r=><tr key={r.id}><td className="px-5 py-4 text-sm font-medium">{names.get(r.employee_id)??r.employee_id.slice(0,8)}</td><td className="px-5 py-4 text-sm">{r.attendance_date}</td><td className="px-5 py-4 text-sm">{r.check_in?new Date(r.check_in).toLocaleTimeString():"—"}</td><td className="px-5 py-4 text-sm">{r.check_out?new Date(r.check_out).toLocaleTimeString():"—"}</td><td className="px-5 py-4 text-sm">{r.late_minutes} min</td><td className="px-5 py-4 text-sm">{r.working_minutes} min</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${r.status==="late"?"bg-amber-50 text-amber-600":"bg-emerald-50 text-emerald-600"}`}>{r.status}</span></td></tr>)}</tbody></table></div>
  </div>
}
