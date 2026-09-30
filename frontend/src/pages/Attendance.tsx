import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Search,
  Filter,
  Check,
} from "lucide-react";
import {
  getAttendance,
  myCheckIn,
  myCheckOut,
  getMyTodayStatus,
  type Attendance as AttendanceRecord,
  type AttendanceTodayStatus,
} from "../api/attendance";
import { getEmployees, type Employee } from "../api/employees";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(isoString: string | null | undefined) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoString;
  }
}

function formatMinutes(minutes: number) {
  if (!minutes || minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function Attendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayStatus, setTodayStatus] = useState<AttendanceTodayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(todayDate());
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [liveWorkingMinutes, setLiveWorkingMinutes] = useState<number>(0);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [attList, empList, myStatus] = await Promise.all([
        getAttendance({ attendance_date: date }),
        getEmployees(),
        getMyTodayStatus().catch(() => null),
      ]);
      setRecords(attList);
      setEmployees(empList);
      if (myStatus) setTodayStatus(myStatus);
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to load attendance data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [date]);

  // Live timer for ongoing working time
  useEffect(() => {
    if (!todayStatus?.attendance?.check_in || todayStatus.attendance.check_out) {
      if (todayStatus?.attendance?.working_minutes) {
        setLiveWorkingMinutes(todayStatus.attendance.working_minutes);
      }
      return;
    }

    const calculate = () => {
      const checkInTime = new Date(todayStatus.attendance!.check_in!).getTime();
      const now = Date.now();
      const mins = Math.max(0, Math.floor((now - checkInTime) / 60000));
      setLiveWorkingMinutes(mins);
    };

    calculate();
    const interval = setInterval(calculate, 30000);
    return () => clearInterval(interval);
  }, [todayStatus]);

  const names = useMemo(
    () => new Map(employees.map((e) => [e.id, `${e.first_name} ${e.last_name ?? ""}`.trim()])),
    [employees]
  );

  const codes = useMemo(
    () => new Map(employees.map((e) => [e.id, e.employee_code])),
    [employees]
  );

  const handleCheckIn = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await myCheckIn();
      const nowStr = new Date(res.check_in || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      showToast(`Checked in successfully at ${nowStr}! Status: ${res.status.toUpperCase()}`);
      // Refresh backend status immediately
      const updatedStatus = await getMyTodayStatus();
      setTodayStatus(updatedStatus);
      const updatedList = await getAttendance({ attendance_date: date });
      setRecords(updatedList);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Check-in failed.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const performCheckOut = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await myCheckOut();
      const outStr = new Date(res.check_out || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      showToast(`Checked out successfully at ${outStr}! Total Working: ${formatMinutes(res.working_minutes)}`);
      // Refresh backend status immediately
      const updatedStatus = await getMyTodayStatus();
      setTodayStatus(updatedStatus);
      const updatedList = await getAttendance({ attendance_date: date });
      setRecords(updatedList);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? "Check-out failed.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOutClick = async () => {
    if (todayStatus?.shift?.end_time) {
      const [endH, endM] = todayStatus.shift.end_time.split(":").map(Number);
      const now = new Date();
      const shiftEnd = new Date();
      shiftEnd.setHours(endH, endM, 0, 0);

      if (now < shiftEnd) {
        const proceed = window.confirm(
          `Your shift ends at ${todayStatus.shift.end_time.slice(0, 5)}. Checking out now is an early departure. Do you want to proceed?`
        );
        if (!proceed) return;
      }
    }
    await performCheckOut();
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const empName = (names.get(r.employee_id) || "").toLowerCase();
      const empCode = (codes.get(r.employee_id) || "").toLowerCase();
      const matchesSearch = empName.includes(searchQuery.toLowerCase()) || empCode.includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter, names, codes]);

  // Statistics
  const stats = useMemo(() => {
    const present = records.filter((r) => r.status === "present").length;
    const late = records.filter((r) => r.status === "late").length;
    const totalWorkingMins = records.reduce((acc, r) => acc + (r.working_minutes || 0), 0);
    return {
      total: records.length,
      present,
      late,
      avgWorkingHours: records.length > 0 ? (totalWorkingMins / records.length / 60).toFixed(1) : "0",
    };
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 shadow-2xl transition-all ${
            toast.type === "success"
              ? "bg-slate-900 text-white border border-emerald-500/30"
              : "bg-rose-900 text-white border border-rose-500/30"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Attendance & Shifts</h2>
          <p className="mt-1 text-sm text-slate-500">
            Real-time daily punch terminal, shift tracking, and organizational attendance logs
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>Server Date: <strong>{todayDate()}</strong></span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* TODAY'S ATTENDANCE STATE MACHINE TERMINAL */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Left: Status & Shift Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Today's Punch Terminal
              </span>

              {/* Status Badge */}
              {todayStatus?.state === "ON_LEAVE" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-400/30 px-3 py-0.5 text-xs font-bold text-rose-300">
                  <AlertTriangle className="w-3 h-3" /> On Approved Leave
                </span>
              ) : todayStatus?.state === "CHECKED_OUT" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-0.5 text-xs font-bold text-blue-300">
                  <Check className="w-3 h-3" /> Checked Out (Completed)
                </span>
              ) : todayStatus?.state === "CHECKED_IN" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-0.5 text-xs font-bold text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Checked In (On Shift)
                </span>
              ) : todayStatus?.state === "LATE" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/30 px-3 py-0.5 text-xs font-bold text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Late (+{todayStatus.attendance?.late_minutes}m)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/20 border border-slate-400/30 px-3 py-0.5 text-xs font-bold text-slate-300">
                  Not Checked In
                </span>
              )}
            </div>

            <h3 className="text-2xl font-bold tracking-tight">
              {todayStatus?.employee
                ? `${todayStatus.employee.first_name} ${todayStatus.employee.last_name || ""}`
                : "Employee Punch Terminal"}
            </h3>

            {/* Shift Details */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              {todayStatus?.shift ? (
                <>
                  <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                    Shift: <strong>{todayStatus.shift.name}</strong> ({todayStatus.shift.start_time.slice(0, 5)} - {todayStatus.shift.end_time.slice(0, 5)})
                  </span>
                  <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                    Grace Period: <strong>{todayStatus.shift.grace_minutes} mins</strong>
                  </span>
                </>
              ) : (
                <span className="bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> No shift assigned to profile
                </span>
              )}
            </div>
          </div>

          {/* Center: Live Timers & Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Check In</p>
              <p className="text-base font-bold text-white mt-0.5">
                {formatTime(todayStatus?.attendance?.check_in)}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Check Out</p>
              <p className="text-base font-bold text-white mt-0.5">
                {formatTime(todayStatus?.attendance?.check_out)}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Working Time</p>
              <p className="text-base font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" />
                {todayStatus?.attendance?.check_out
                  ? formatMinutes(todayStatus.attendance.working_minutes)
                  : formatMinutes(liveWorkingMinutes)}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Late Penalty</p>
              <p className="text-base font-bold text-amber-400 mt-0.5">
                {todayStatus?.attendance?.late_minutes ? `+${todayStatus.attendance.late_minutes} min` : "0 min"}
              </p>
            </div>
          </div>

          {/* Right: State-Machine Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {todayStatus?.state === "ON_LEAVE" ? (
              <div className="px-5 py-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold text-center">
                Leave Approved Today: {todayStatus.leave_reason || "Scheduled Time Off"}
              </div>
            ) : !todayStatus?.has_shift ? (
              <button
                disabled
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700/50 px-5 py-3.5 text-sm font-semibold text-slate-400 cursor-not-allowed border border-white/5"
              >
                <LogIn size={18} /> Shift Required
              </button>
            ) : todayStatus?.state === "NOT_CHECKED_IN" ? (
              <button
                disabled={busy}
                onClick={handleCheckIn}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition-all active:scale-95 disabled:opacity-50"
              >
                <LogIn size={18} /> Check In Now
              </button>
            ) : todayStatus?.state === "CHECKED_IN" || todayStatus?.state === "LATE" ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  disabled
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 px-4 py-3.5 text-xs font-bold text-emerald-300 cursor-default"
                >
                  <CheckCircle2 size={16} /> Checked In
                </button>
                <button
                  disabled={busy}
                  onClick={handleCheckOutClick}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-900/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  <LogOut size={18} /> Check Out
                </button>
              </div>
            ) : (
              <div className="px-5 py-3.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-400" />
                Shift Completed Today
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">On-Time</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.present}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Late Arrivals</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.late}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Working Hours</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.avgWorkingHours}h</p>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present (On-Time)</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-2">
            <span>Date:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Check In</th>
                <th className="px-6 py-4">Check Out</th>
                <th className="px-6 py-4">Late Minutes</th>
                <th className="px-6 py-4">Working Time</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading attendance records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No attendance records found for this date.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const empName = names.get(r.employee_id) || "—";
                  const empCode = codes.get(r.employee_id) || r.employee_id.slice(0, 8);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{empName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{empCode}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{r.attendance_date}</td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-800">
                        {formatTime(r.check_in)}
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-slate-800">
                        {formatTime(r.check_out)}
                      </td>
                      <td className="px-6 py-4">
                        {r.late_minutes > 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                            +{r.late_minutes}m
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {formatMinutes(r.working_minutes)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${
                            r.status === "late"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : r.status === "half_day"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
