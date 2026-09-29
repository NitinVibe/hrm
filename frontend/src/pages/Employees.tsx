import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Plus, Search, UserX, X } from "lucide-react";
import { createEmployee, deactivateEmployee, getEmployees, updateEmployee, type Employee, type EmployeePayload } from "../api/employees";
import { getDepartments, type Department } from "../api/departments";
import { getDesignations, type Designation } from "../api/designations";
import { getShifts, type Shift } from "../api/shifts";

interface Props { onChanged?: () => void; }

const emptyForm: EmployeePayload = {
  first_name: "", last_name: "", email: "", phone: "",
  joining_date: new Date().toISOString().slice(0, 10),
  employment_status: "active", department_id: null, designation_id: null, shift_id: null,
};

export default function Employees({ onChanged }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<EmployeePayload>(emptyForm);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [e, d, des, s] = await Promise.all([getEmployees(), getDepartments(), getDesignations(), getShifts()]);
      setEmployees(e); setDepartments(d); setDesignations(des); setShifts(s);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to load employee data.");
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter(e => `${e.first_name} ${e.last_name ?? ""} ${e.email ?? ""} ${e.employee_code}`.toLowerCase().includes(q));
  }, [employees, search]);

  function openCreate() { setEditing(null); setForm(emptyForm); setError(""); setOpen(true); }
  function openEdit(e: Employee) {
    setEditing(e);
    setForm({ first_name:e.first_name, last_name:e.last_name, email:e.email, phone:e.phone,
      date_of_birth:e.date_of_birth, joining_date:e.joining_date, employment_status:e.employment_status,
      department_id:e.department_id, designation_id:e.designation_id, shift_id:e.shift_id, user_id:e.user_id });
    setError(""); setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      if (editing) await updateEmployee(editing.id, form);
      else await createEmployee(form);
      setOpen(false); await load(); onChanged?.();
    } catch (err: any) { setError(err?.response?.data?.detail ?? "Unable to save employee."); }
  }

  async function deactivate(e: Employee) {
    if (!window.confirm(`Deactivate ${e.first_name} ${e.last_name ?? ""}?`)) return;
    try { await deactivateEmployee(e.id); await load(); onChanged?.(); }
    catch (err: any) { setError(err?.response?.data?.detail ?? "Unable to deactivate employee."); }
  }

  const deptName = (id: string | null) => departments.find(d => d.id === id)?.name ?? "—";
  const desName = (id: string | null) => designations.find(d => d.id === id)?.name ?? "—";
  const shiftName = (id: string | null) => shifts.find(s => s.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h2 className="text-3xl font-bold text-slate-900">Employees</h2><p className="mt-1 text-sm text-slate-500">{employees.length} employee profiles</p></div>
        <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"><Plus size={18}/> Add Employee</button>
      </div>
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-5"><div className="relative max-w-md"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email or employee code..." className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-400"/></div></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400"><tr>
            {["Employee","Code","Department","Designation","Shift","Status","Actions"].map(h=><th key={h} className="px-5 py-4 font-medium">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">Loading employees...</td></tr> :
            filtered.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">No employees found.</td></tr> :
            filtered.map(e => <tr key={e.id} className="hover:bg-slate-50">
              <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">{`${e.first_name[0] ?? ""}${e.last_name?.[0] ?? ""}`.toUpperCase()}</div><div><p className="text-sm font-semibold">{`${e.first_name} ${e.last_name ?? ""}`.trim()}</p><p className="text-xs text-slate-400">{e.email ?? "No email"}</p></div></div></td>
              <td className="px-5 py-4 text-sm text-slate-500">{e.employee_code}</td>
              <td className="px-5 py-4 text-sm">{deptName(e.department_id)}</td>
              <td className="px-5 py-4 text-sm">{desName(e.designation_id)}</td>
              <td className="px-5 py-4 text-sm">{shiftName(e.shift_id)}</td>
              <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${e.employment_status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{e.employment_status}</span></td>
              <td className="px-5 py-4"><div className="flex gap-2"><button onClick={()=>openEdit(e)} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50"><Pencil size={17}/></button><button onClick={()=>void deactivate(e)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><UserX size={17}/></button></div></td>
            </tr>)}
          </tbody></table>
        </div>
      </div>

      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between"><div><h3 className="text-xl font-bold">{editing ? "Edit Employee" : "Add Employee"}</h3><p className="text-sm text-slate-400">Employee profile details</p></div><button onClick={()=>setOpen(false)}><X/></button></div>
          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="First name" value={form.first_name} required onChange={v=>setForm({...form, first_name:v})}/>
            <Field label="Last name" value={form.last_name ?? ""} onChange={v=>setForm({...form,last_name:v||null})}/>
            <Field label="Email" type="email" value={form.email ?? ""} onChange={v=>setForm({...form,email:v||null})}/>
            <Field label="Phone" value={form.phone ?? ""} onChange={v=>setForm({...form,phone:v||null})}/>
            <Field label="Joining date" type="date" value={form.joining_date ?? ""} onChange={v=>setForm({...form,joining_date:v||null})}/>
            <Field label="Date of birth" type="date" value={form.date_of_birth ?? ""} onChange={v=>setForm({...form,date_of_birth:v||null})}/>
            <Select label="Department" value={form.department_id ?? ""} options={departments.filter(d=>d.is_active).map(d=>[d.id,d.name])} onChange={v=>setForm({...form,department_id:v||null})}/>
            <Select label="Designation" value={form.designation_id ?? ""} options={designations.filter(d=>d.is_active).map(d=>[d.id,d.name])} onChange={v=>setForm({...form,designation_id:v||null})}/>
            <Select label="Shift" value={form.shift_id ?? ""} options={shifts.filter(s=>s.is_active).map(s=>[s.id,s.name])} onChange={v=>setForm({...form,shift_id:v||null})}/>
            <Select label="Status" value={form.employment_status ?? "active"} options={[["active","Active"],["inactive","Inactive"]]} onChange={v=>setForm({...form,employment_status:v})}/>
            <div className="sm:col-span-2 flex justify-end gap-3 pt-2"><button type="button" onClick={()=>setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm">Cancel</button><button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">{editing ? "Save changes" : "Create employee"}</button></div>
          </form>
        </div>
      </div>}
    </div>
  );
}

function Field({label,value,onChange,type="text",required=false}:{label:string;value:string;onChange:(v:string)=>void;type?:string;required?:boolean}) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span><input required={required} type={type} value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"/></label>;
}
function Select({label,value,options,onChange}:{label:string;value:string;options:string[][];onChange:(v:string)=>void}) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span><select value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"><option value="">Not assigned</option>{options.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>;
}
