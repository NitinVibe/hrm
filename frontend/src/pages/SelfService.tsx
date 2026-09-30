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
} from "lucide-react";
import { getUserProfile, type UserProfile } from "../api/auth";
import {
  myCheckIn,
  myCheckOut,
  getAttendance,
  requestRegularization,
  getRegularizations,
  type Attendance,
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

export default function SelfService() {
  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "leaves" | "payroll" | "goals">("overview");
  const [_loading, setLoading] = useState(true);

  // Profile
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);

  // States
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [regularizations, setRegularizations] = useState<AttendanceRegularization[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myLeaves, setMyLeaves] = useState<Leave[]>([]);
  const [myPayslips, setMyPayslips] = useState<Payslip[]>([]);
  const [myGoals, setMyGoals] = useState<Goal[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);
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

  const fetchProfileAndData = async () => {
    setLoading(true);
    try {
      const prof = await getUserProfile();
      setProfile(prof);

      const empId = prof.employee?.id;
      const today = new Date().toISOString().split("T")[0];

      const [types, ann, allEmployees] = await Promise.all([
        getLeaveTypes(),
        getAnnouncements(),
        getEmployees(),
      ]);
      setLeaveTypes(types);
      setAnnouncements(ann);

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
        const todayAtt = attList.find((a) => a.attendance_date === today);
        setTodayAttendance(todayAtt || null);

        setRegularizations(regs.filter((r) => r.employee_id === empId));
        setLeaveBalances(balances);
        setMyLeaves(leaves.filter((l) => l.employee_id === empId));
        setMyPayslips(payslips);
        setMyGoals(goals);
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

  // Quick Check In / Check Out
  const handleCheckIn = async () => {
    try {
      await myCheckIn();
      alert("Checked in successfully!");
      fetchProfileAndData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Check in failed.");
    }
  };

  const handleCheckOut = async () => {
    try {
      await myCheckOut();
      alert("Checked out successfully!");
      fetchProfileAndData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Check out failed.");
    }
  };

  // Submit Leave
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.employee?.id) {
      alert("No employee profile found.");
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
      alert("Leave application submitted for approval!");
      fetchProfileAndData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to submit leave application.");
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
      alert("Regularization request submitted!");
      fetchProfileAndData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to submit regularization.");
    }
  };

  // Update Goal Progress
  const handleGoalProgress = async (goalId: string, val: number) => {
    try {
      await updateGoal(goalId, {
        progress_percentage: val,
        status: val >= 100 ? "achieved" : val > 0 ? "in_progress" : "not_started",
      });
      fetchProfileAndData();
    } catch (err: any) {
      alert("Failed to update goal.");
    }
  };

  return (
    <div className="space-y-6">
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
            <p className="text-xs text-indigo-200 mt-1 flex items-center gap-3">
              <span>Code: <strong>{profile?.employee?.employee_code || "N/A"}</strong></span>
              <span>Organization: <strong>{profile?.organization?.name || "Enterprise"}</strong></span>
              <span>Status: <strong className="capitalize">{profile?.employee?.employment_status || "Active"}</strong></span>
            </p>
          </div>
        </div>

        {/* Quick Punch Widget */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 flex items-center gap-4">
          <div>
            <p className="text-xs text-indigo-200 font-medium">Today's Attendance</p>
            <p className="text-sm font-bold mt-0.5">
              {todayAttendance?.check_in
                ? `In: ${new Date(todayAttendance.check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Not Checked In"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!todayAttendance?.check_in ? (
              <button
                onClick={handleCheckIn}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Check In
              </button>
            ) : !todayAttendance?.check_out ? (
              <button
                onClick={handleCheckOut}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg shadow transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Check Out
              </button>
            ) : (
              <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-200 text-xs font-bold rounded-lg border border-emerald-400/30 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Completed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
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
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
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
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
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
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
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
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "goals"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Target className="w-4 h-4" />
          My OKRs & Goals ({myGoals.length})
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
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{profile?.employee?.employee_code || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Employment Type</span>
                  <span className="font-bold text-slate-800 text-sm capitalize mt-0.5">{employeeDetails?.employment_type || "Full Time"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Joining Date</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{profile?.employee?.joining_date || "2026-01-15"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Work Email</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 truncate">{profile?.user.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Phone</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{profile?.employee?.phone || "+1 (555) 000-0000"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Blood Group</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{employeeDetails?.blood_group || "O+"}</span>
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
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{employeeDetails?.bank_name || "HDFC Bank"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Account Number</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 font-mono">{employeeDetails?.bank_account_number || "••••••••5678"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">IFSC / Routing</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 font-mono">{employeeDetails?.bank_ifsc_code || "HDFC0001234"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">PAN Identification</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 font-mono">{employeeDetails?.pan_number || "ABCDE1234F"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Aadhaar / National ID</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 font-mono">{employeeDetails?.aadhar_number || "•••• •••• 9012"}</span>
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
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{employeeDetails?.emergency_contact_name || "Family Contact"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Relationship</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{employeeDetails?.emergency_contact_relation || "Spouse / Parent"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Emergency Phone</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5">{employeeDetails?.emergency_contact_phone || "+1 (555) 999-8888"}</span>
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

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-2">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Quick Actions</h3>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="w-full flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Apply for Leave
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
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE & REGULARIZATION */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
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
                        <td className="px-6 py-3 font-mono">{r.requested_check_in || "-"}</td>
                        <td className="px-6 py-3 font-mono">{r.requested_check_out || "-"}</td>
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
                        <td className="px-6 py-3.5 text-xs font-mono">
                          {att.check_in ? new Date(att.check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                        </td>
                        <td className="px-6 py-3.5 text-xs font-mono">
                          {att.check_out ? new Date(att.check_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                        </td>
                        <td className="px-6 py-3.5 text-xs">
                          {att.working_minutes ? `${(att.working_minutes / 60).toFixed(1)} hrs` : "-"}
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
                        <td className="px-6 py-3.5 text-xs text-slate-500">{l.reason || "-"}</td>
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
                          className={`px-2 py-0.5 text-[11px] rounded font-bold border ${
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
