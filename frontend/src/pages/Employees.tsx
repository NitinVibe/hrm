import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Pencil,
  Plus,
  Search,
  UserX,
  X,
  KeyRound,
  CheckCircle2,
  MapPin,
  Clock,
} from "lucide-react";
import {
  createEmployee,
  deactivateEmployee,
  getEmployees,
  updateEmployee,
  createEmployeeLoginAccount,
  type Employee,
  type EmployeePayload,
} from "../api/employees";
import { getDepartments, type Department } from "../api/departments";
import { getDesignations, type Designation } from "../api/designations";
import { getShifts, type Shift } from "../api/shifts";
import { getBranches, type Branch } from "../api/branches";

interface Props {
  onChanged?: () => void;
}

const emptyForm: EmployeePayload & { create_account?: boolean; temp_password?: string; role?: string } = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  joining_date: new Date().toISOString().slice(0, 10),
  employment_status: "active",
  employment_type: "Full-Time",
  department_id: null,
  designation_id: null,
  shift_id: null,
  branch_id: null,
  create_account: false,
  temp_password: "Welcome@123",
  role: "EMPLOYEE",
};

export default function Employees({ onChanged }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Account creation modal state
  const [accountModalEmp, setAccountModalEmp] = useState<Employee | null>(null);
  const [accountPassword, setAccountPassword] = useState("Welcome@123");
  const [accountRole, setAccountRole] = useState("EMPLOYEE");
  const [accountSuccess, setAccountSuccess] = useState<any>(null);
  const [accountLoading, setAccountLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [e, d, des, s, b] = await Promise.all([
        getEmployees(),
        getDepartments(),
        getDesignations(),
        getShifts(),
        getBranches().catch(() => []),
      ]);
      setEmployees(e);
      setDepartments(d);
      setDesignations(des);
      setShifts(s);
      setBranches(b);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to load employee data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter((e) =>
      `${e.first_name} ${e.last_name ?? ""} ${e.email ?? ""} ${e.employee_code}`.toLowerCase().includes(q)
    );
  }, [employees, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  }

  function openEdit(e: Employee) {
    setEditing(e);
    setForm({
      first_name: e.first_name,
      last_name: e.last_name,
      email: e.email,
      phone: e.phone,
      date_of_birth: e.date_of_birth,
      joining_date: e.joining_date,
      employment_status: e.employment_status,
      employment_type: e.employment_type || "Full-Time",
      department_id: e.department_id,
      designation_id: e.designation_id,
      shift_id: e.shift_id,
      branch_id: e.branch_id,
      user_id: e.user_id,
      create_account: false,
      temp_password: "Welcome@123",
      role: "EMPLOYEE",
    });
    setError("");
    setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (editing) {
        await updateEmployee(editing.id, form);
      } else {
        const payload: EmployeePayload = {
          ...form,
          create_login_account: form.create_account,
          temporary_password: form.create_account ? form.temp_password : undefined,
          account_role: form.create_account ? form.role : undefined,
        };
        await createEmployee(payload);
      }
      setOpen(false);
      await load();
      onChanged?.();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Unable to save employee.");
    }
  }

  async function deactivate(e: Employee) {
    if (!window.confirm(`Deactivate ${e.first_name} ${e.last_name ?? ""}?`)) return;
    try {
      await deactivateEmployee(e.id);
      await load();
      onChanged?.();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Unable to deactivate employee.");
    }
  }

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!accountModalEmp) return;
    setAccountLoading(true);
    try {
      const res = await createEmployeeLoginAccount(accountModalEmp.id, accountPassword, accountRole);
      setAccountSuccess(res);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to create login account.");
    } finally {
      setAccountLoading(false);
    }
  };

  const deptName = (id: string | null) => departments.find((d) => d.id === id)?.name ?? "—";
  const desName = (id: string | null) => designations.find((d) => d.id === id)?.name ?? "—";
  const shiftName = (id: string | null) => shifts.find((s) => s.id === id)?.name ?? "—";
  const branchName = (id: string | null | undefined) => branches.find((b) => b.id === id)?.name ?? "HQ";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Employees Directory</h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {employees.length} total staff · Manage profiles, departments, credentials & assignments
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
        >
          <Plus size={17} /> Add New Employee
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-xs sm:text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {/* Main Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or Employee ID..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-xs sm:text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-700">{filtered.length}</span> employees
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                {["Employee", "Employee ID", "Branch & Dept", "Designation", "Shift", "Portal Account", "Status", "Actions"].map(
                  (h) => (
                    <th key={h} className="px-5 py-3.5">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    Loading directory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    No employees matching search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition">
                    {/* Employee Profile */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-black text-xs text-indigo-600 border border-indigo-100">
                          {`${e.first_name[0] ?? ""}${e.last_name?.[0] ?? ""}`.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {e.first_name} {e.last_name ?? ""}
                          </p>
                          <p className="text-[11px] text-slate-400">{e.email || "No email assigned"}</p>
                        </div>
                      </div>
                    </td>

                    {/* Employee ID */}
                    <td className="px-5 py-4 font-mono font-bold text-indigo-700 bg-indigo-50/20">
                      {e.employee_code}
                    </td>

                    {/* Branch & Dept */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{deptName(e.department_id)}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin size={11} /> {branchName(e.branch_id)}
                      </p>
                    </td>

                    {/* Designation */}
                    <td className="px-5 py-4 font-medium text-slate-700">{desName(e.designation_id)}</td>

                    {/* Shift */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        <Clock size={11} /> {shiftName(e.shift_id)}
                      </span>
                    </td>

                    {/* Portal Login Account */}
                    <td className="px-5 py-4">
                      {e.user_id ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={12} /> Active Account
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setAccountModalEmp(e);
                            setAccountSuccess(null);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200 transition"
                        >
                          <KeyRound size={12} /> Create Login
                        </button>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          e.employment_status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {e.employment_status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(e)}
                          title="Edit Employee"
                          className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => void deactivate(e)}
                          title="Deactivate"
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 transition"
                        >
                          <UserX size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{editing ? "Edit Employee Profile" : "Onboard New Employee"}</h3>
                <p className="text-xs text-slate-400">Complete enterprise identity, assignments and login credentials</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="First Name" value={form.first_name} required onChange={(v) => setForm({ ...form, first_name: v })} />
                <Field label="Last Name" value={form.last_name ?? ""} onChange={(v) => setForm({ ...form, last_name: v || null })} />
                <Field label="Work Email" type="email" value={form.email ?? ""} required={form.create_account} onChange={(v) => setForm({ ...form, email: v || null })} />
                <Field label="Phone Number" value={form.phone ?? ""} onChange={(v) => setForm({ ...form, phone: v || null })} />
                <Field label="Joining Date" type="date" value={form.joining_date ?? ""} onChange={(v) => setForm({ ...form, joining_date: v || null })} />
                <Field label="Date of Birth" type="date" value={form.date_of_birth ?? ""} onChange={(v) => setForm({ ...form, date_of_birth: v || null })} />
                
                <Select
                  label="Branch Office"
                  value={form.branch_id ?? ""}
                  options={branches.filter((b) => b.is_active).map((b) => [b.id, `${b.name} (${b.city || "HQ"})`])}
                  onChange={(v) => setForm({ ...form, branch_id: v || null })}
                />
                <Select
                  label="Department"
                  value={form.department_id ?? ""}
                  options={departments.filter((d) => d.is_active).map((d) => [d.id, d.name])}
                  onChange={(v) => setForm({ ...form, department_id: v || null })}
                />
                <Select
                  label="Designation"
                  value={form.designation_id ?? ""}
                  options={designations.filter((d) => d.is_active).map((d) => [d.id, d.name])}
                  onChange={(v) => setForm({ ...form, designation_id: v || null })}
                />
                <Select
                  label="Working Shift"
                  value={form.shift_id ?? ""}
                  options={shifts.filter((s) => s.is_active).map((s) => [s.id, s.name])}
                  onChange={(v) => setForm({ ...form, shift_id: v || null })}
                />
                <Select
                  label="Status"
                  value={form.employment_status ?? "active"}
                  options={[
                    ["active", "Active"],
                    ["inactive", "Inactive"],
                  ]}
                  onChange={(v) => setForm({ ...form, employment_status: v })}
                />
              </div>

              {/* Account Provisioning (For New Employees) */}
              {!editing && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={form.create_account}
                      onChange={(e) => setForm({ ...form, create_account: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Create login account for this employee immediately
                    </span>
                  </label>

                  {form.create_account && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 pt-2 border-t border-indigo-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Temporary Password</label>
                        <input
                          type="text"
                          value={form.temp_password}
                          onChange={(e) => setForm({ ...form, temp_password: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Access Role</label>
                        <select
                          value={form.role}
                          onChange={(e) => setForm({ ...form, role: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500"
                        >
                          <option value="EMPLOYEE">Employee (ESS Portal)</option>
                          <option value="MANAGER">Manager (Team Portal + ESS)</option>
                          <option value="HR">HR Specialist</option>
                        </select>
                      </div>
                      <p className="sm:col-span-2 text-[10px] text-slate-400">
                        An Employee ID will be auto-generated. You can share their Employee ID/Email and temporary password for portal access.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                >
                  {editing ? "Save Changes" : "Create Employee Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Create/Reset Login Account Modal */}
      {accountModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <KeyRound size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Provision Portal Account</h3>
                  <p className="text-[11px] text-slate-400">{accountModalEmp.first_name} {accountModalEmp.last_name}</p>
                </div>
              </div>
              <button onClick={() => setAccountModalEmp(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            {accountSuccess ? (
              <div className="space-y-4 text-center py-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Account Ready!</h4>
                  <p className="text-xs text-slate-500 mt-1">Share these credentials with the employee to login:</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-left space-y-1.5 border border-slate-200 text-xs">
                  <p><span className="text-slate-400 font-medium">Employee ID:</span> <span className="font-mono font-bold text-indigo-700">{accountSuccess.username}</span></p>
                  <p><span className="text-slate-400 font-medium">Email:</span> <span className="font-semibold text-slate-800">{accountSuccess.email}</span></p>
                  <p><span className="text-slate-400 font-medium">Password:</span> <span className="font-mono font-bold text-slate-800">{accountPassword}</span></p>
                </div>
                <button
                  onClick={() => setAccountModalEmp(null)}
                  className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Email</label>
                  <input
                    type="text"
                    disabled
                    value={accountModalEmp.email || "No email on record"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password</label>
                  <input
                    type="text"
                    required
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Portal Role</label>
                  <select
                    value={accountRole}
                    onChange={(e) => setAccountRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="EMPLOYEE">Employee (ESS Portal)</option>
                    <option value="MANAGER">Manager (Team Portal)</option>
                    <option value="HR">HR Specialist</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAccountModalEmp(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={accountLoading || !accountModalEmp.email}
                    className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {accountLoading ? "Provisioning..." : "Generate Account"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      >
        <option value="">Not assigned</option>
        {options.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
