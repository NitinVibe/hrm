import React, { useEffect, useState } from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  Target,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  X,
  UserCheck,
} from "lucide-react";
import { getUserProfile, type UserProfile } from "../api/auth";
import { getEmployees, type Employee } from "../api/employees";
import {
  getAttendance,
  getRegularizations,
  approveRegularization,
  rejectRegularization,
  type Attendance,
  type AttendanceRegularization,
} from "../api/attendance";
import { getLeaves, approveLeave, rejectLeave, type Leave } from "../api/leaves";
import { getGoals, type Goal } from "../api/performance";

export default function ManagerPortal() {
  const [_loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"leaves" | "regularizations" | "team" | "goals">("leaves");

  // Data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<Leave[]>([]);
  const [pendingRegs, setPendingRegs] = useState<AttendanceRegularization[]>([]);
  const [teamAttendance, setTeamAttendance] = useState<Attendance[]>([]);
  const [teamGoals, setTeamGoals] = useState<Goal[]>([]);

  // Modals
  const [rejectLeaveItem, setRejectLeaveItem] = useState<Leave | null>(null);
  const [rejectRegItem, setRejectRegItem] = useState<AttendanceRegularization | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const prof = await getUserProfile();
      setProfile(prof);

      const today = new Date().toISOString().split("T")[0];
      const [allEmps, allLeaves, allRegs, attToday, goals] = await Promise.all([
        getEmployees(),
        getLeaves(),
        getRegularizations(),
        getAttendance({ date: today }),
        getGoals(),
      ]);

      const myEmpId = prof.employee?.id;

      // Filter team members: subordinates of this manager, or all employees if org admin/super admin
      let team = allEmps;
      if (prof.user.role === "MANAGER" && myEmpId) {
        team = allEmps.filter((e) => e.reporting_manager_id === myEmpId);
      }
      setTeamMembers(team);

      const teamIds = new Set(team.map((e) => e.id));

      // Filter pending requests for team
      const teamLeaves = allLeaves.filter((l) => teamIds.has(l.employee_id) && l.status === "pending");
      const teamRegList = allRegs.filter((r) => teamIds.has(r.employee_id) && r.status === "pending");

      setPendingLeaves(teamLeaves);
      setPendingRegs(teamRegList);
      setTeamAttendance(attToday.filter((a) => teamIds.has(a.employee_id)));
      setTeamGoals(goals.filter((g) => teamIds.has(g.employee_id)));
    } catch (err) {
      console.error("Failed to load manager portal data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getEmployeeName = (id: string) => {
    const emp = teamMembers.find((e) => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name || ""} (${emp.employee_code})` : id.slice(0, 8);
  };

  // Leave Actions
  const handleApproveLeave = async (id: string) => {
    try {
      await approveLeave(id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to approve leave.");
    }
  };

  const handleRejectLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectLeaveItem) return;
    try {
      await rejectLeave(rejectLeaveItem.id, rejectionReason);
      setRejectLeaveItem(null);
      setRejectionReason("");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to reject leave.");
    }
  };

  // Regularization Actions
  const handleApproveReg = async (id: string) => {
    try {
      await approveRegularization(id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to approve regularization.");
    }
  };

  const handleRejectReg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectRegItem) return;
    try {
      await rejectRegularization(rejectRegItem.id, rejectionReason);
      setRejectRegItem(null);
      setRejectionReason("");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to reject regularization.");
    }
  };

  // Stats
  const teamCount = teamMembers.length;
  const presentCount = teamAttendance.filter((a) => a.check_in !== null).length;
  const pendingApprovalsCount = pendingLeaves.length + pendingRegs.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manager & Team Portal</h1>
          <p className="text-sm text-slate-500 mt-1">
            Supervise direct subordinates, approve leave & attendance requests, and review team OKRs.
            {profile && <span className="ml-2 font-bold text-indigo-600">({pendingApprovalsCount} pending approvals)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 text-sm font-medium"
            title="Refresh Inboxes"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Direct Team Size</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{teamCount}</p>
            <p className="text-xs text-indigo-600 font-medium mt-1">Supervised employees</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Present Today</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{presentCount}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Checked in today</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Leaves</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingLeaves.length}</p>
            <p className="text-xs text-amber-600 font-medium mt-1">Awaiting your approval</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Regularizations</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{pendingRegs.length}</p>
            <p className="text-xs text-indigo-600 font-medium mt-1">Missed punch corrections</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("leaves")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "leaves"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Leave Approvals ({pendingLeaves.length})
        </button>
        <button
          onClick={() => setActiveTab("regularizations")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "regularizations"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          Regularization Approvals ({pendingRegs.length})
        </button>
        <button
          onClick={() => setActiveTab("team")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "team"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Team Roster ({teamMembers.length})
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
          Team OKRs & Progress ({teamGoals.length})
        </button>
      </div>

      {/* TAB 1: LEAVE APPROVALS */}
      {activeTab === "leaves" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Pending Leave Applications</h2>
            <span className="text-xs text-slate-400">Review time-off requests submitted by team members</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Team Member</th>
                  <th className="px-6 py-3">Leave Type</th>
                  <th className="px-6 py-3">Dates</th>
                  <th className="px-6 py-3">Mode</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">Inbox is clean</p>
                      <p className="text-xs text-slate-400 mt-0.5">No pending leave requests requiring manager review.</p>
                    </td>
                  </tr>
                ) : (
                  pendingLeaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{getEmployeeName(leave.employee_id)}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">{leave.leave_type}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-indigo-600">
                        {leave.start_date} → {leave.end_date}
                      </td>
                      <td className="px-6 py-4 text-xs capitalize">
                        {leave.is_half_day ? `Half Day (${leave.half_day_session?.replace("_", " ")})` : "Full Day"}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{leave.reason || "-"}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApproveLeave(leave.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition-colors"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectLeaveItem(leave);
                              setRejectionReason("");
                            }}
                            className="flex items-center gap-1 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-colors"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                            Reject
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
      )}

      {/* TAB 2: REGULARIZATION APPROVALS */}
      {activeTab === "regularizations" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Pending Attendance Regularizations</h2>
            <span className="text-xs text-slate-400">Review missing punch correction requests</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Team Member</th>
                  <th className="px-6 py-3">Attendance Date</th>
                  <th className="px-6 py-3">Requested In</th>
                  <th className="px-6 py-3">Requested Out</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingRegs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No regularizations pending</p>
                      <p className="text-xs text-slate-400 mt-0.5">All attendance punches are up to date.</p>
                    </td>
                  </tr>
                ) : (
                  pendingRegs.map((reg) => (
                    <tr key={reg.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{getEmployeeName(reg.employee_id)}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{reg.attendance_date}</td>
                      <td className="px-6 py-4 text-xs font-mono">{reg.requested_check_in || "-"}</td>
                      <td className="px-6 py-4 text-xs font-mono">{reg.requested_check_out || "-"}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{reg.reason}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApproveReg(reg.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition-colors"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectRegItem(reg);
                              setRejectionReason("");
                            }}
                            className="flex items-center gap-1 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-colors"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                            Reject
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
      )}

      {/* TAB 3: TEAM ROSTER & ATTENDANCE */}
      {activeTab === "team" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Team Roster & Today's Attendance</h2>
            <span className="text-xs text-slate-400">Direct report headcount and live punch status</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Member</th>
                  <th className="px-6 py-3">Code / Phone</th>
                  <th className="px-6 py-3">Employment Type</th>
                  <th className="px-6 py-3">Today's Punch</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No direct reports assigned to this manager profile.
                    </td>
                  </tr>
                ) : (
                  teamMembers.map((emp) => {
                    const att = teamAttendance.find((a) => a.employee_id === emp.id);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{emp.first_name} {emp.last_name || ""}</p>
                          <p className="text-xs text-slate-400">{emp.email || "No email"}</p>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="font-semibold text-slate-800">{emp.employee_code}</div>
                          <div className="text-slate-400">{emp.phone || "-"}</div>
                        </td>
                        <td className="px-6 py-4 text-xs capitalize font-medium">{emp.employment_type || "Full Time"}</td>
                        <td className="px-6 py-4 text-xs font-mono">
                          {att?.check_in
                            ? `In: ${new Date(att.check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : "Absent / Not Checked In"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase ${
                              att?.check_in
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {att?.check_in ? "Present" : "Not In"}
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
      )}

      {/* TAB 4: TEAM GOALS */}
      {activeTab === "goals" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 pb-2 border-b border-slate-100">
              Team Performance Goals & OKR Progress
            </h2>
            <div className="divide-y divide-slate-100 pt-3">
              {teamGoals.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No active team goals logged.</p>
              ) : (
                teamGoals.map((g) => (
                  <div key={g.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {getEmployeeName(g.employee_id)}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{g.title}</h4>
                      <p className="text-xs text-slate-500">{g.description || "No extra details"}</p>
                    </div>

                    <div className="w-48 shrink-0">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-500">Progress</span>
                        <span className="text-indigo-600">{g.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${g.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REJECT LEAVE WITH REASON */}
      {rejectLeaveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Decline Leave Request</h3>
              <button
                onClick={() => setRejectLeaveItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectLeave} className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Rejecting leave for <strong>{getEmployeeName(rejectLeaveItem.employee_id)}</strong> (
                {rejectLeaveItem.start_date} to {rejectLeaveItem.end_date}).
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rejection Reason *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Critical release sprint deadline, low departmental coverage..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectLeaveItem(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium shadow"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REJECT REGULARIZATION WITH REASON */}
      {rejectRegItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Decline Attendance Correction</h3>
              <button
                onClick={() => setRejectRegItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectReg} className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Rejecting punch correction for <strong>{getEmployeeName(rejectRegItem.employee_id)}</strong> on{" "}
                <strong>{rejectRegItem.attendance_date}</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rejection Reason *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Unverified hours or conflicting gate logs..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectRegItem(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium shadow"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
