import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Eye,
  FileSpreadsheet,
  FileText,
  Layers,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import {
  approvePayrollRun,
  getEmployeeSalaries,
  getPayrollRuns,
  getPayslips,
  getSalaryStructures,
  markPayrollPaid,
  processPayrollRun,
  type EmployeeSalary,
  type PayrollRun,
  type Payslip,
  type SalaryStructure,
} from "../api/payroll";
import { getEmployees, type Employee } from "../api/employees";

type Tab = "runs" | "structures" | "compensation" | "payslips";

export default function Payroll() {
  const [activeTab, setActiveTab] = useState<Tab>("runs");
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [salaries, setSalaries] = useState<EmployeeSalary[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Process Run Modal
  const [isProcessModalOpen, setIsProcessModalOpen] = useState<boolean>(false);
  const [processMonth, setProcessMonth] = useState<number>(new Date().getMonth() + 1);
  const [processYear, setProcessYear] = useState<number>(new Date().getFullYear());
  const [processNotes, setProcessNotes] = useState<string>("");
  const [processBusy, setProcessBusy] = useState<boolean>(false);

  // Payslip Details Modal
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);

  async function loadAllData() {
    setLoading(true);
    setError("");
    try {
      const [rData, sData, salData, pData, eData] = await Promise.all([
        getPayrollRuns(),
        getSalaryStructures(),
        getEmployeeSalaries(),
        getPayslips(),
        getEmployees(),
      ]);
      setRuns(rData);
      setStructures(sData);
      setSalaries(salData);
      setPayslips(pData);
      setEmployees(eData);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to load payroll data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAllData();
  }, []);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  async function handleProcessSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProcessBusy(true);
    setError("");
    try {
      await processPayrollRun({
        month: Number(processMonth),
        year: Number(processYear),
        notes: processNotes,
      });
      setSuccess(`Payroll for ${processMonth}/${processYear} processed successfully!`);
      setIsProcessModalOpen(false);
      await loadAllData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Payroll processing failed.");
    } finally {
      setProcessBusy(false);
    }
  }

  async function handleApproveRun(id: string) {
    try {
      await approvePayrollRun(id);
      setSuccess("Payroll run approved.");
      await loadAllData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Approval failed.");
    }
  }

  async function handleDisburseRun(id: string) {
    try {
      await markPayrollPaid(id);
      setSuccess("Payroll disbursed and marked as PAID. Payslips published to staff.");
      await loadAllData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Disbursement failed.");
    }
  }

  // Summary Metrics
  const latestRun = runs[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Enterprise Payroll & Compensation
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Automated salary calculations, statutory deductions (PF/TDS), payroll batch processing, and payslip distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadAllData()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setIsProcessModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <FileSpreadsheet size={18} />
            Run Payroll Batch
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")}><X size={16} /></button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")}><X size={16} /></button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <DollarSign size={20} />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Monthly Gross Disbursed
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            ₹{(latestRun?.total_gross ?? 0).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-slate-500">Last run: {latestRun ? `${latestRun.month}/${latestRun.year}` : "N/A"}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Banknote size={20} />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Net Salary Disbursed
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            ₹{(latestRun?.total_net ?? 0).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-slate-500">Credited to staff bank accounts</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <CreditCard size={20} />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Statutory Deductions (PF/Tax)
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            ₹{(latestRun?.total_deductions ?? 0).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-slate-500">Compliance & withholding</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <FileText size={20} />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Generated Payslips
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{payslips.length}</p>
          <p className="mt-1 text-xs text-slate-500">Across all payroll periods</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { key: "runs", label: "Payroll Runs & Batches", icon: FileSpreadsheet },
          { key: "payslips", label: "Payslips Vault", icon: FileText },
          { key: "compensation", label: "Employee Compensation", icon: Users },
          { key: "structures", label: "Salary Structures", icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as Tab)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: RUNS */}
      {activeTab === "runs" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Total Gross</th>
                  <th className="px-6 py-4">Total Deductions</th>
                  <th className="px-6 py-4">Net Disbursed</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-400">
                      No payroll runs processed yet. Click "Run Payroll Batch" above.
                    </td>
                  </tr>
                ) : (
                  runs.map((r) => (
                    <tr key={r.id} className="transition hover:bg-slate-50/70">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {r.month}/{r.year}
                        {r.notes && <span className="block text-xs font-normal text-slate-400">{r.notes}</span>}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        ₹{r.total_gross.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-amber-600">
                        -₹{r.total_deductions.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-700">
                        ₹{r.total_net.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            r.status === "paid"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : r.status === "approved"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {r.status === "draft" && (
                            <button
                              onClick={() => void handleApproveRun(r.id)}
                              className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                            >
                              Approve
                            </button>
                          )}
                          {r.status === "approved" && (
                            <button
                              onClick={() => void handleDisburseRun(r.id)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow hover:bg-emerald-700"
                            >
                              Disburse & Pay
                            </button>
                          )}
                          {r.status === "paid" && (
                            <span className="text-xs text-slate-400 font-medium">Completed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PAYSLIPS VAULT */}
      {activeTab === "payslips" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Month/Year</th>
                  <th className="px-6 py-4">Gross Salary</th>
                  <th className="px-6 py-4">Deductions</th>
                  <th className="px-6 py-4">Net Salary</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payslips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400">
                      No payslips generated yet.
                    </td>
                  </tr>
                ) : (
                  payslips.map((p) => {
                    const emp = empMap.get(p.employee_id);
                    return (
                      <tr key={p.id} className="transition hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">
                            {emp ? `${emp.first_name} ${emp.last_name ?? ""}`.trim() : p.employee_id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-slate-400">{emp?.employee_code}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-700">
                          {p.month}/{p.year}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                          ₹{p.gross_salary.toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4 text-xs text-amber-600">
                          -₹{(p.pf_deduction + p.tax_deduction + p.other_deductions).toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-700">
                          ₹{p.net_salary.toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            {p.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setViewingPayslip(p)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Eye size={13} />
                            View Payslip
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: COMPENSATION */}
      {activeTab === "compensation" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Basic Pay</th>
                  <th className="px-6 py-4">HRA</th>
                  <th className="px-6 py-4">Allowances</th>
                  <th className="px-6 py-4">Gross Monthly</th>
                  <th className="px-6 py-4">Net Monthly</th>
                  <th className="px-6 py-4">Effective From</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400">
                      No compensation assignments found.
                    </td>
                  </tr>
                ) : (
                  salaries.map((s) => {
                    const emp = empMap.get(s.employee_id);
                    return (
                      <tr key={s.id} className="transition hover:bg-slate-50/70">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">
                            {emp ? `${emp.first_name} ${emp.last_name ?? ""}`.trim() : s.employee_id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-slate-400">{emp?.employee_code}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-700">₹{s.basic_salary.toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-700">₹{s.hra.toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-700">₹{(s.conveyance_allowance + s.special_allowance).toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">₹{s.gross_salary.toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 font-bold text-emerald-700">₹{s.net_salary.toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 text-xs text-slate-500">{s.effective_date}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: STRUCTURES */}
      {activeTab === "structures" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {structures.map((st) => (
            <div key={st.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">Grade Structure</span>
                <span className="text-xs font-semibold text-emerald-600">Active</span>
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">{st.name}</h3>
              <p className="mt-1 text-xs text-slate-500">{st.description ?? "Standard organization compensation band"}</p>
              <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <span className="text-xs text-slate-400">Annual Base CTC</span>
                <p className="text-lg font-bold text-slate-900">₹{st.base_annual_ctc.toLocaleString("en-IN")}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Process Payroll Modal */}
      {isProcessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Process Monthly Payroll Run</h2>
              <button onClick={() => setIsProcessModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProcessSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Month</label>
                  <select
                    value={processMonth}
                    onChange={(e) => setProcessMonth(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Month {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Year</label>
                  <input
                    type="number"
                    value={processYear}
                    onChange={(e) => setProcessYear(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Payroll Cycle Notes</label>
                <input
                  type="text"
                  value={processNotes}
                  onChange={(e) => setProcessNotes(e.target.value)}
                  placeholder="e.g. Regular monthly payroll run"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-800">
                ℹ️ This will compute earnings, statutory deductions, PF, and TDS for all active organization staff.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProcessModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processBusy}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  {processBusy && <RefreshCw size={14} className="animate-spin" />}
                  Execute Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip View Modal */}
      {viewingPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Employee Payslip</h2>
                <p className="text-xs text-slate-500">Period: {viewingPayslip.month}/{viewingPayslip.year}</p>
              </div>
              <button onClick={() => setViewingPayslip(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="font-bold text-slate-900">
                  {empMap.get(viewingPayslip.employee_id)?.first_name} {empMap.get(viewingPayslip.employee_id)?.last_name}
                </p>
                <p className="text-slate-500">Employee Code: {empMap.get(viewingPayslip.employee_id)?.employee_code}</p>
                <p className="text-slate-500">Working Days: {viewingPayslip.working_days} | Present: {viewingPayslip.present_days}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 border-r border-slate-100 pr-3">
                  <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Earnings</p>
                  <div className="flex justify-between text-slate-600"><span>Basic Pay</span><span>₹{viewingPayslip.basic_salary.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between text-slate-600"><span>HRA</span><span>₹{viewingPayslip.hra.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Allowances</span><span>₹{viewingPayslip.allowances.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100"><span>Total Gross</span><span>₹{viewingPayslip.gross_salary.toLocaleString("en-IN")}</span></div>
                </div>

                <div className="space-y-2 pl-3">
                  <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Deductions</p>
                  <div className="flex justify-between text-slate-600"><span>Provident Fund</span><span>₹{viewingPayslip.pf_deduction.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between text-slate-600"><span>TDS / Income Tax</span><span>₹{viewingPayslip.tax_deduction.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Other</span><span>₹{viewingPayslip.other_deductions.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between font-bold text-amber-700 pt-2 border-t border-slate-100"><span>Total Deductions</span><span>₹{(viewingPayslip.pf_deduction + viewingPayslip.tax_deduction + viewingPayslip.other_deductions).toLocaleString("en-IN")}</span></div>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-50 p-4 flex items-center justify-between border border-emerald-200">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Net Take-Home Pay</p>
                  <p className="text-xl font-bold text-emerald-800">₹{viewingPayslip.net_salary.toLocaleString("en-IN")}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800 text-xs">
                  {viewingPayslip.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingPayslip(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
