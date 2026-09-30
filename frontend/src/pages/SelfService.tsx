import React, { useEffect, useState } from "react";
import {
  User,
  Clock,
  Calendar,
  DollarSign,
  Target,
  Megaphone,
  CheckCircle2,
  CreditCard,
  Phone,
  Plus,
  LogOut,
  LogIn,
  X,
  ChevronRight,
  Briefcase,
  AlertCircle,
  FileText,
  Timer,
  ShieldCheck,
} from "lucide-react";
import { getUserProfile, type UserProfile } from "../api/auth";
import {
  myCheckIn,
  myCheckOut,
  getMyTodayStatus,
  getAttendance,
  requestRegularization,
  getRegularizations,
  type Attendance,
  type AttendanceTodayStatus,
  type AttendanceRegularization,
} from "../api/attendance";
import {
  getLeaves,
  createLeave,
  getLeaveTypes,
  getEmployeeLeaveBalances,
  type Leave,
  type LeaveType,
  type LeaveBalance,
} from "../api/leaves";
import { getPayslips, type Payslip } from "../api/payroll";
import { getGoals, updateGoal, type Goal } from "../api/performance";
import { getAnnouncements, type Announcement } from "../api/announcements";
import { getEmployees, type Employee } from "../api/employees";
import {
  submitResignation,
  getResignations,
  type Resignation,
} from "../api/resignations";

function formatMinutes(minutes: number) {
  if (!minutes || minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatTime(isoString: string | null | undefined) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoString;
  }
}

export default function SelfService() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "attendance" | "leaves" | "payroll" | "goals" | "resignation"
  >("overview");
  const [_loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Profile & Employee info
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);

  // States
  const [todayStatus, setTodayStatus] = useState<AttendanceTodayStatus | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [regularizations, setRegularizations] = useState<AttendanceRegularization[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myLeaves, setMyLeaves] = useState<Leave[]>([]);
  const [myPayslips, setMyPayslips] = useState<Payslip[]>([]);
  const [myGoals, setMyGoals] = useState<Goal[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [myResignations, setMyResignations] = useState<Resignation[]>([]);

  // Live timer
  const [liveWorkingMinutes, setLiveWorkingMinutes] = useState<number>(0);

  // Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);
  const [showResignModal, setShowResignModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  // Forms
  const [leaveForm, setLeaveForm] = useState({
    leave_type: "Casual Leave",
    leave_type_id: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    is_half_day: false,
    half_day_session: "first_half",
    reason: "",
  });

  const [regForm, setRegForm] = useState({
    attendance_date: new Date().toISOString().split("T")[0],
    requested_check_in: "09:00",
    requested_check_out: "18:00",
    reason: "",
  });

  const [resignForm, setResignForm] = useState({
    reason: "",
    proposed_last_working_day: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProfileAndData = async () => {
    setLoading(true);
    try {
      const prof = await getUserProfile();
      setProfile(prof);

      const empId = prof.employee?.id;

      const [types, ann, allEmployees, todayStat, resignList] = await Promise.all([
        getLeaveTypes(),
        getAnnouncements(),
        getEmployees(),
        getMyTodayStatus().catch(() => null),
        getResignations().catch(() => []),
      ]);

      setLeaveTypes(types);
      setAnnouncements(ann);
      if (todayStat) setTodayStatus(todayStat);

      if (empId) {
        const fullEmp = allEmployees.find((e) => e.id === empId);
        if (fullEmp) setEmployeeDetails(fullEmp);

        const [attList, regs, balances, leaves, payslips, goals] = await Promise.all([
          getAttendance({ employee_id: empId }),
          getRegularizations(),
          getEmployeeLeaveBalances(empId),
          getLeaves(),
          getPayslips({ employee_id: empId }),
          getGoals({ employee_id: empId }),
        ]);

        setAttendanceHistory(attList);
        setRegularizations(regs.filter((r) => r.employee_id === empId));
        setLeaveBalances(balances);
        setMyLeaves(leaves.filter((l) => l.employee_id === empId));
        setMyPayslips(payslips);
        setMyGoals(goals);
        setMyResignations(resignList.filter((r) => r.employee_id === empId));
      }
    } catch (err) {
      console.error("Failed to load ESS data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndData();
  }, []);

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

  // Quick Check In / Check Out with state machine
  const handleCheckIn = async () => {
    setBusy(true);
    try {
      const res = await myCheckIn();
      const nowStr = new Date(res.check_in || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      showToast(`Checked in successfully at ${nowStr}!`);
      const updatedStatus = await getMyTodayStatus();
      setTodayStatus(updatedStatus);
      if (profile?.employee?.id) {
        const attList = await getAttendance({ employee_id: profile.employee.id });
        setAttendanceHistory(attList);
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Check in failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const performCheckOut = async () => {
    setBusy(true);
    try {
      const res = await myCheckOut();
      const outStr = new Date(res.check_out || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      showToast(`Checked out successfully at ${outStr}!`);
      const updatedStatus = await getMyTodayStatus();
      setTodayStatus(updatedStatus);
      if (profile?.employee?.id) {
        const attList = await getAttendance({ employee_id: profile.employee.id });
        setAttendanceHistory(attList);
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Check out failed.", "error");
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

  // Submit Leave
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.employee?.id) {
      showToast("No employee profile found.", "error");
      return;
    }
    try {
      await createLeave({
        employee_id: profile.employee.id,
        leave_type: leaveForm.leave_type,
        leave_type_id: leaveForm.leave_type_id || undefined,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        is_half_day: leaveForm.is_half_day,
        half_day_session: leaveForm.is_half_day ? leaveForm.half_day_session : undefined,
        reason: leaveForm.reason,
      });
      setShowLeaveModal(false);
      showToast("Leave application submitted for approval!");
      // Reset form
      setLeaveForm({
        ...leaveForm,
        reason: "",
      });
      // Refetch
      const [balances, leaves] = await Promise.all([
        getEmployeeLeaveBalances(profile.employee.id),
        getLeaves(),
      ]);
      setLeaveBalances(balances);
      setMyLeaves(leaves.filter((l) => l.employee_id === profile.employee!.id));
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to submit leave application.", "error");
    }
  };

  // Submit Regularization
  const handleApplyReg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestRegularization({
        attendance_date: regForm.attendance_date,
        requested_check_in: regForm.requested_check_in ? `${regForm.requested_check_in}:00` : undefined,
        requested_check_out: regForm.requested_check_out ? `${regForm.requested_check_out}:00` : undefined,
        reason: regForm.reason,
      });
      setShowRegModal(false);
      showToast("Regularization request submitted!");
      setRegForm({ ...regForm, reason: "" });
      const regs = await getRegularizations();
      if (profile?.employee?.id) {
        setRegularizations(regs.filter((r) => r.employee_id === profile.employee!.id));
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to submit regularization.", "error");
    }
  };

  // Submit Resignation
  const handleApplyResign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitResignation({
        reason: resignForm.reason,
        proposed_last_working_day: resignForm.proposed_last_working_day,
      });
      setShowResignModal(false);
      showToast("Resignation letter formally submitted!");
      setResignForm({ reason: "", proposed_last_working_day: "" });
      const resignList = await getResignations();
      if (profile?.employee?.id) {
        setMyResignations(resignList.filter((r) => r.employee_id === profile.employee!.id));
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to submit resignation.", "error");
    }
  };

  // Update Goal Progress
  const handleGoalProgress = async (goalId: string, val: number) => {
    try {
      await updateGoal(goalId, {
        progress_percentage: val,
        status: val >= 100 ? "achieved" : val > 0 ? "in_progress" : "not_started",
      });
      showToast(`Goal progress updated to ${val}%!`);
      if (profile?.employee?.id) {
        const goals = await getGoals({ employee_id: profile.employee.id });
        setMyGoals(goals);
      }
    } catch (err: any) {
      showToast("Failed to update goal.", "error");
    }
  };

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

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-2xl text-white shadow-inner">
            {profile?.employee ? profile.employee.first_name[0] : "E"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {profile?.employee
                  ? `${profile.employee.first_name} ${profile.employee.last_name || ""}`
                  : profile?.user.email}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 border border-indigo-400/40 text-indigo-100">
                {profile?.user.role || "Employee"}
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-1 flex flex-wrap items-center gap-3">
              <span>Code: <strong>{profile?.employee?.employee_code || "—"}</strong></span>
              <span>Organization: <strong>{profile?.organization?.name || "Enterprise"}</strong></span>
              <span>Status: <strong className="capitalize">{profile?.employee?.employment_status || "Active"}</strong></span>
              {todayStatus?.shift && (
                <span>Shift: <strong>{todayStatus.shift.name} ({todayStatus.shift.start_time.slice(0, 5)} - {todayStatus.shift.end_time.slice(0, 5)})</strong></span>
              )}
            </p>
          </div>
        </div>

        {/* Quick Punch Widget */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 flex items-center gap-4">
          <div>
            <p className="text-xs text-indigo-200 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Today's Punch
            </p>
            <p className="text-sm font-bold mt-0.5">
              {todayStatus?.state === "ON_LEAVE" ? (
                <span className="text-rose-300">On Leave</span>
              ) : todayStatus?.state === "CHECKED_OUT" ? (
                <span className="text-blue-300">Out: {formatTime(todayStatus.attendance?.check_out)}</span>
              ) : todayStatus?.state === "CHECKED_IN" || todayStatus?.state === "LATE" ? (
                <span className="text-emerald-300">In: {formatTime(todayStatus.attendance?.check_in)} ({formatMinutes(liveWorkingMinutes)})</span>
              ) : (
                <span className="text-slate-300">Not Checked In</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {todayStatus?.state === "ON_LEAVE" ? (
              <span className="px-3 py-1.5 bg-rose-500/20 text-rose-200 text-xs font-bold rounded-lg border border-rose-400/30">
                On Leave
              </span>
            ) : !todayStatus?.has_shift ? (
              <span className="px-3 py-1.5 bg-slate-700/50 text-slate-300 text-xs font-medium rounded-lg">
                No Shift
              </span>
            ) : todayStatus?.state === "NOT_CHECKED_IN" ? (
              <button
                disabled={busy}
                onClick={handleCheckIn}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow transition-colors active:scale-95 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                Check In
              </button>
            ) : todayStatus?.state === "CHECKED_IN" || todayStatus?.state === "LATE" ? (
              <button
                disabled={busy}
                onClick={handleCheckOutClick}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg shadow transition-colors active:scale-95 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                Check Out
              </button>
            ) : (
              <span className="px-3 py-1.5 bg-blue-500/20 text-blue-200 text-xs font-bold rounded-lg border border-blue-400/30 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Completed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <User className="w-4 h-4" />
          My Profile & Info
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "attendance"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          Attendance & Regularization
        </button>
        <button
          onClick={() => setActiveTab("leaves")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "leaves"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Leaves & Balances ({leaveBalances.length})
        </button>
        <button
          onClick={() => setActiveTab("payroll")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "payroll"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          My Payslips ({myPayslips.length})
        </button>
        <button
          onClick={() => setActiveTab("goals")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "goals"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Target className="w-4 h-4" />
          My OKRs & Goals ({myGoals.length})
        </button>
        <button
          onClick={() => setActiveTab("resignation")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "resignation"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Resignation & Exit Clearance ({myResignations.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & PROFILE */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Identity & Corporate Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-4 border-b border-slate-100">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                Employment & Role Details
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Employee Code</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{profile?.employee?.employee_code || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Employment Type</span>
                  <span className="font-bold text-slate-800 text-sm capitalize mt-0.5">{employeeDetails?.employment_type || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Joining Date</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{profile?.employee?.joining_date || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Work Email</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 truncate">{profile?.user.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Phone</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{profile?.employee?.phone || employeeDetails?.phone || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Blood Group</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{employeeDetails?.blood_group || "—"}</span>
                </div>
              </div>
            </div>

            {/* Financial & Banking */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-4 border-b border-slate-100">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                Bank Account & Tax Credentials
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Bank Name</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{employeeDetails?.bank_name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Account Number</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 font-mono">{employeeDetails?.account_number || employeeDetails?.bank_account_number || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">IFSC / Routing</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 font-mono">{employeeDetails?.ifsc_code || employeeDetails?.bank_ifsc_code || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">PAN Identification</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 font-mono">{employeeDetails?.pan_number || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Aadhaar / National ID</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 font-mono">{employeeDetails?.aadhar_number || "—"}</span>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-4 border-b border-slate-100">
                <Phone className="w-4 h-4 text-rose-500" />
                Emergency Contact Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Contact Name</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{employeeDetails?.emergency_contact_name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Relationship</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{employeeDetails?.emergency_contact_relation || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Emergency Phone</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{employeeDetails?.emergency_contact_phone || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar / Bulletins */}
          <div className="space-y-6">
            {/* Announcements Bulletin */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Megaphone className="w-4 h-4 text-indigo-600" />
                Company Bulletins
              </h3>
              <div className="space-y-3 pt-3">
                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-400">No active bulletins.</p>
                ) : (
                  announcements.slice(0, 3).map((a) => (
                    <div key={a.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {a.priority}
                        </span>
                        <span className="text-[10px] text-slate-400">{new Date(a.created_at).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mt-1">{a.title}</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{a.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Quick Access</h3>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Request Time Off
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => setShowRegModal(true)}
                className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Regularize Attendance
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => setShowResignModal(true)}
                className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-600" />
                  Submit Resignation
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE & REGULARIZATION */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Prominent Today Punch Terminal */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 p-6 text-white shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Today's Attendance Status
                  </span>
                  {todayStatus?.state === "ON_LEAVE" ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
                      On Approved Leave
                    </span>
                  ) : todayStatus?.state === "CHECKED_OUT" ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                      Checked Out
                    </span>
                  ) : todayStatus?.state === "CHECKED_IN" ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                      Checked In
                    </span>
                  ) : todayStatus?.state === "LATE" ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                      Late (+{todayStatus.attendance?.late_minutes}m)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-500/20 text-slate-300 text-xs font-bold border border-slate-500/30">
                      Not Checked In
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-300 flex items-center gap-4">
                  {todayStatus?.shift ? (
                    <span>Shift: <strong>{todayStatus.shift.name}</strong> ({todayStatus.shift.start_time.slice(0, 5)} - {todayStatus.shift.end_time.slice(0, 5)})</span>
                  ) : (
                    <span className="text-amber-300">No shift assigned</span>
                  )}
                  <span>Grace: {todayStatus?.shift?.grace_minutes || 0} mins</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase">Check In</p>
                  <p className="text-sm font-bold text-white mt-0.5">{formatTime(todayStatus?.attendance?.check_in)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase">Check Out</p>
                  <p className="text-sm font-bold text-white mt-0.5">{formatTime(todayStatus?.attendance?.check_out)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase">Working Time</p>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    {todayStatus?.attendance?.check_out
                      ? formatMinutes(todayStatus.attendance.working_minutes)
                      : formatMinutes(liveWorkingMinutes)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase">Late Penalty</p>
                  <p className="text-sm font-bold text-amber-400 mt-0.5">
                    {todayStatus?.attendance?.late_minutes ? `+${todayStatus.attendance.late_minutes}m` : "0m"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {todayStatus?.state === "NOT_CHECKED_IN" && todayStatus?.has_shift && (
                  <button
                    disabled={busy}
                    onClick={handleCheckIn}
                    className="flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" /> Check In Now
                  </button>
                )}

                {(todayStatus?.state === "CHECKED_IN" || todayStatus?.state === "LATE") && (
                  <button
                    disabled={busy}
                    onClick={handleCheckOutClick}
                    className="flex items-center gap-2 px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" /> Check Out
                  </button>
                )}

                {todayStatus?.state === "CHECKED_OUT" && (
                  <div className="px-4 py-2.5 bg-blue-500/20 text-blue-200 text-xs font-bold rounded-xl border border-blue-400/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" /> Shift Completed
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">My Attendance Log & Regularizations</h2>
            <button
              onClick={() => setShowRegModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-lg transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              Request Regularization
            </button>
          </div>

          {/* Pending Regularizations Table */}
          {regularizations.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
              <div className="px-6 py-3 bg-amber-50/50 border-b border-amber-200 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Attendance Correction Requests ({regularizations.length})
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-2.5">Date</th>
                      <th className="px-6 py-2.5">Requested In</th>
                      <th className="px-6 py-2.5">Requested Out</th>
                      <th className="px-6 py-2.5">Reason</th>
                      <th className="px-6 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regularizations.map((r) => (
                      <tr key={r.id}>
                        <td className="px-6 py-3 font-bold text-slate-800">{r.attendance_date}</td>
                        <td className="px-6 py-3 font-mono">{r.requested_check_in || "—"}</td>
                        <td className="px-6 py-3 font-mono">{r.requested_check_out || "—"}</td>
                        <td className="px-6 py-3">{r.reason}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                              r.status === "approved"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : r.status === "rejected"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily Attendance History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Attendance History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Check In</th>
                    <th className="px-6 py-3">Check Out</th>
                    <th className="px-6 py-3">Hours Worked</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        No attendance records logged yet.
                      </td>
                    </tr>
                  ) : (
                    attendanceHistory.slice(0, 15).map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{att.attendance_date}</td>
                        <td className="px-6 py-3.5 text-xs font-mono">{formatTime(att.check_in)}</td>
                        <td className="px-6 py-3.5 text-xs font-mono">{formatTime(att.check_out)}</td>
                        <td className="px-6 py-3.5 text-xs font-medium text-slate-800">
                          {formatMinutes(att.working_minutes)}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase ${
                              att.status === "present"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : att.status === "late"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LEAVES & BALANCES */}
      {activeTab === "leaves" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">My Leave Portfolio</h2>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              Apply Leave
            </button>
          </div>

          {/* Leave Balances Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {leaveBalances.map((b) => {
              const lt = leaveTypes.find((t) => t.id === b.leave_type_id);
              return (
                <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{lt?.name || "Leave Balance"}</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-indigo-600">{b.available_days} Days</span>
                    <span className="text-xs text-slate-400">of {b.total_allocated} total</span>
                  </div>
                  <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{ width: `${Math.min((b.available_days / (b.total_allocated || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>Used: {b.used_days}d</span>
                    <span>Pending: {b.pending_days}d</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leave Applications History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">My Leave Applications</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Leave Type</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Reason</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        No leave applications submitted yet.
                      </td>
                    </tr>
                  ) : (
                    myLeaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{l.leave_type}</td>
                        <td className="px-6 py-3.5 text-xs">
                          {l.start_date} → {l.end_date}
                        </td>
                        <td className="px-6 py-3.5 text-xs capitalize">
                          {l.is_half_day ? `Half Day (${l.half_day_session?.replace("_", " ")})` : "Full Day"}
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-500">{l.reason || "—"}</td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase ${
                              l.status === "approved"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : l.status === "rejected"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MY PAYSLIPS */}
      {activeTab === "payroll" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">My Monthly Salary Payslips</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Payslip Number</th>
                    <th className="px-6 py-3">Gross Earnings</th>
                    <th className="px-6 py-3">Total Deductions</th>
                    <th className="px-6 py-3">Net Take-Home</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myPayslips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        No payslips released yet.
                      </td>
                    </tr>
                  ) : (
                    myPayslips.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-900 font-mono">
                          PAY-{p.year}-{String(p.month).padStart(2, "0")}-{p.id.slice(0, 6).toUpperCase()}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-800">₹{p.gross_salary.toLocaleString()}</td>
                        <td className="px-6 py-3.5 text-rose-600 font-bold">₹{(p.gross_salary - p.net_salary).toLocaleString()}</td>
                        <td className="px-6 py-3.5 font-black text-emerald-600 text-base">₹{p.net_salary.toLocaleString()}</td>
                        <td className="px-6 py-3.5">
                          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedPayslip(p)}
                            className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-lg transition-colors"
                          >
                            View Payslip
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MY OKRS & GOALS */}
      {activeTab === "goals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">My Assigned Performance Goals</h2>
            <span className="text-xs text-slate-400">Update your current progress against milestones</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myGoals.length === 0 ? (
              <div className="col-span-2 bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                No goals currently assigned to you.
              </div>
            ) : (
              myGoals.map((g) => (
                <div key={g.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Weight: {g.weightage}%
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-1">{g.title}</h4>
                      {g.description && <p className="text-xs text-slate-500 mt-0.5">{g.description}</p>}
                    </div>
                    <span className="text-xs font-bold text-indigo-600">{g.progress_percentage}%</span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${g.progress_percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400">Update My Progress:</span>
                    <div className="flex items-center gap-1.5">
                      {[25, 50, 75, 100].map((v) => (
                        <button
                          key={v}
                          onClick={() => handleGoalProgress(g.id, v)}
                          className={`px-2 py-0.5 text-[11px] rounded font-bold border transition-colors ${
                            g.progress_percentage === v
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {v}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: RESIGNATION & EXIT CLEARANCE */}
      {activeTab === "resignation" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Formal Resignation & Separation Portal</h2>
              <p className="text-xs text-slate-400 mt-0.5">Submit notice, track exit clearance, and view settlement milestones</p>
            </div>
            {myResignations.length === 0 && (
              <button
                onClick={() => setShowResignModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
              >
                <FileText className="w-4 h-4" />
                Submit Resignation
              </button>
            )}
          </div>

          {myResignations.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Active Separation Requests</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                You do not have any open resignation or exit requests. Your employment status is active with regular benefits and payroll.
              </p>
            </div>
          ) : (
            myResignations.map((res) => (
              <div key={res.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">Separation Reference #{res.id.slice(0, 8)}</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          res.status === "completed"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : res.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : res.status === "rejected"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {res.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Submitted on <strong>{res.resignation_date}</strong> • Notice Period: <strong>{res.notice_period_days} Days</strong>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400 block">Final Last Working Day</span>
                    <span className="text-base font-bold text-indigo-600">
                      {res.final_last_working_day || res.proposed_last_working_day}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reason for Separation</h4>
                  <p className="text-xs text-slate-700 mt-1">{res.reason}</p>
                  {res.comments && (
                    <div className="mt-3 pt-3 border-t border-slate-200 text-xs">
                      <strong className="text-slate-600">Manager/HR Feedback:</strong>
                      <p className="text-slate-500 mt-0.5">{res.comments}</p>
                    </div>
                  )}
                </div>

                {/* Separation Milestones Checklist */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Exit Clearance Checklist
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 block">Hardware & Assets</span>
                      <div className="flex items-center gap-2">
                        {res.asset_returned ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                        <span className="text-xs font-bold text-slate-800">
                          {res.asset_returned ? "Assets Handed Over" : "Pending Return"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 block">Department Clearance</span>
                      <div className="flex items-center gap-2">
                        {res.clearance_status === "completed" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                        <span className="text-xs font-bold text-slate-800 capitalize">
                          {res.clearance_status.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 block">Final Settlement (FnF)</span>
                      <div className="flex items-center gap-2">
                        {res.final_settlement_status === "paid" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                        <span className="text-xs font-bold text-slate-800 capitalize">
                          {res.final_settlement_status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: SUBMIT RESIGNATION */}
      {showResignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Submit Resignation</h3>
              <button
                onClick={() => setShowResignModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyResign} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Last Working Day *</label>
                <input
                  type="date"
                  required
                  value={resignForm.proposed_last_working_day}
                  onChange={(e) => setResignForm({ ...resignForm, proposed_last_working_day: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Resignation *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail your reasons for departure, future plans, or transition handover..."
                  value={resignForm.reason}
                  onChange={(e) => setResignForm({ ...resignForm, reason: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                Submitting a formal resignation will notify your reporting manager and HR department to initiate the notice period and transition roadmap.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResignModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium shadow"
                >
                  Confirm & Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPLY LEAVE */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Apply for Leave</h3>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Type *</label>
                <select
                  required
                  value={leaveForm.leave_type_id}
                  onChange={(e) => {
                    const sel = leaveTypes.find((lt) => lt.id === e.target.value);
                    setLeaveForm({
                      ...leaveForm,
                      leave_type_id: e.target.value,
                      leave_type: sel ? sel.name : "Casual Leave",
                    });
                  }}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.days_allowed_per_year}d/yr)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="halfDay"
                  checked={leaveForm.is_half_day}
                  onChange={(e) => setLeaveForm({ ...leaveForm, is_half_day: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="halfDay" className="text-xs font-medium text-slate-700">
                  Half-day leave
                </label>
              </div>

              {leaveForm.is_half_day && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Session</label>
                  <select
                    value={leaveForm.half_day_session}
                    onChange={(e) => setLeaveForm({ ...leaveForm, half_day_session: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="first_half">First Half (Morning)</option>
                    <option value="second_half">Second Half (Afternoon)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Absence</label>
                <textarea
                  rows={2}
                  placeholder="Personal reason, doctor appointment, etc."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGULARIZE ATTENDANCE */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Attendance Regularization</h3>
              <button
                onClick={() => setShowRegModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyReg} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date to Correct *</label>
                <input
                  type="date"
                  required
                  value={regForm.attendance_date}
                  onChange={(e) => setRegForm({ ...regForm, attendance_date: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Check-In</label>
                  <input
                    type="time"
                    value={regForm.requested_check_in}
                    onChange={(e) => setRegForm({ ...regForm, requested_check_in: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Check-Out</label>
                  <input
                    type="time"
                    value={regForm.requested_check_out}
                    onChange={(e) => setRegForm({ ...regForm, requested_check_out: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Missing Punch *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Biometric reader malfunction, client site visit..."
                  value={regForm.reason}
                  onChange={(e) => setRegForm({ ...regForm, reason: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW PAYSLIP BREAKDOWN */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Official Salary Payslip</h3>
                <p className="text-xs text-slate-400 font-mono">
                  PAY-{selectedPayslip.year}-{String(selectedPayslip.month).padStart(2, "0")}-{selectedPayslip.id.slice(0, 6).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Earnings</h4>
                <div className="flex justify-between"><span>Basic:</span><strong>₹{selectedPayslip.basic_salary.toLocaleString()}</strong></div>
                <div className="flex justify-between"><span>HRA:</span><strong>₹{selectedPayslip.hra.toLocaleString()}</strong></div>
                <div className="flex justify-between"><span>Allowances:</span><strong>₹{selectedPayslip.allowances.toLocaleString()}</strong></div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-emerald-700 font-black">
                  <span>Gross Earnings:</span><span>₹{selectedPayslip.gross_salary.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2 p-3 bg-slate-50 rounded-xl">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Deductions</h4>
                <div className="flex justify-between"><span>PF Employee:</span><strong>₹{selectedPayslip.pf_deduction.toLocaleString()}</strong></div>
                <div className="flex justify-between"><span>TDS / Income Tax:</span><strong>₹{selectedPayslip.tax_deduction.toLocaleString()}</strong></div>
                <div className="flex justify-between"><span>Other Deductions:</span><strong>₹{selectedPayslip.other_deductions.toLocaleString()}</strong></div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-rose-700 font-black">
                  <span>Total Deductions:</span><span>₹{(selectedPayslip.gross_salary - selectedPayslip.net_salary).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-700 font-medium">Net Take-Home Pay</span>
                <p className="text-2xl font-black text-emerald-800">₹{selectedPayslip.net_salary.toLocaleString()}</p>
              </div>
              <span className="px-3 py-1 bg-emerald-200 text-emerald-900 font-bold text-xs rounded-full">
                PAID VIA DIRECT DEPOSIT
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedPayslip(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
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
