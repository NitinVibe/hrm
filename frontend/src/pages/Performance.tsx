import React, { useEffect, useState } from "react";
import {
  Target,
  Award,
  TrendingUp,
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit,
  Star,
  UserCheck,
  RefreshCw,
  X,
} from "lucide-react";
import {
  type PerformanceCycle,
  type Goal,
  type PerformanceReview,
  getPerformanceCycles,
  createPerformanceCycle,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getPerformanceReviews,
  createPerformanceReview,
  updatePerformanceReview,
} from "../api/performance";
import { getEmployees, type Employee } from "../api/employees";

export default function Performance() {
  const [activeTab, setActiveTab] = useState<"goals" | "cycles" | "reviews">("goals");
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<PerformanceCycle[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Filters & search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCycleFilter, setSelectedCycleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [reviewingItem, setReviewingItem] = useState<PerformanceReview | null>(null);

  // Goal Form State
  const [goalForm, setGoalForm] = useState({
    employee_id: "",
    cycle_id: "",
    title: "",
    description: "",
    metric_kpi: "",
    target_value: "",
    current_value: "",
    weightage: 25,
  });

  // Cycle Form State
  const [cycleForm, setCycleForm] = useState({
    title: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
    status: "active",
  });

  // Review Form State
  const [reviewForm, setReviewForm] = useState({
    cycle_id: "",
    employee_id: "",
    reviewer_id: "",
    manager_rating: 4,
    manager_feedback: "",
    status: "completed" as const,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cyclesData, goalsData, reviewsData, employeesData] = await Promise.all([
        getPerformanceCycles(),
        getGoals(),
        getPerformanceReviews(),
        getEmployees(),
      ]);
      setCycles(cyclesData);
      setGoals(goalsData);
      setReviews(reviewsData);
      setEmployees(employeesData);
    } catch (err) {
      console.error("Failed to load performance data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getEmployeeName = (id?: string | null) => {
    if (!id) return "Unassigned";
    const emp = employees.find((e) => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name || ""}` : id.slice(0, 8);
  };

  const getCycleTitle = (id?: string | null) => {
    if (!id) return "General / Ongoing";
    const c = cycles.find((item) => item.id === id);
    return c ? c.title : id.slice(0, 8);
  };

  // Metrics
  const totalGoals = goals.length;
  const achievedGoals = goals.filter((g) => g.status === "achieved").length;
  const avgProgress = totalGoals > 0 ? Math.round(goals.reduce((acc, g) => acc + g.progress_percentage, 0) / totalGoals) : 0;
  const activeCycles = cycles.filter((c) => c.status === "active").length;

  // Handlers
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, {
          title: goalForm.title,
          description: goalForm.description,
          metric_kpi: goalForm.metric_kpi,
          target_value: goalForm.target_value,
          current_value: goalForm.current_value,
          weightage: Number(goalForm.weightage),
        });
      } else {
        await createGoal({
          employee_id: goalForm.employee_id,
          cycle_id: goalForm.cycle_id || undefined,
          title: goalForm.title,
          description: goalForm.description,
          metric_kpi: goalForm.metric_kpi,
          target_value: goalForm.target_value,
          current_value: goalForm.current_value,
          weightage: Number(goalForm.weightage),
        });
      }
      setShowGoalModal(false);
      setEditingGoal(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save goal.");
    }
  };

  const handleUpdateProgress = async (goal: Goal, newPercent: number) => {
    const newStatus = newPercent >= 100 ? "achieved" : newPercent > 0 ? "in_progress" : "not_started";
    try {
      await updateGoal(goal.id, {
        progress_percentage: newPercent,
        status: newStatus as any,
      });
      fetchData();
    } catch (err: any) {
      alert("Failed to update goal progress.");
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Are you sure you want to remove this goal?")) return;
    try {
      await deleteGoal(id);
      fetchData();
    } catch (err: any) {
      alert("Failed to delete goal.");
    }
  };

  const handleSaveCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPerformanceCycle(cycleForm);
      setShowCycleModal(false);
      setCycleForm({
        title: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0],
        status: "active",
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create cycle.");
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (reviewingItem) {
        await updatePerformanceReview(reviewingItem.id, {
          manager_rating: reviewForm.manager_rating,
          manager_feedback: reviewForm.manager_feedback,
          status: "completed",
        });
      } else {
        await createPerformanceReview({
          cycle_id: reviewForm.cycle_id,
          employee_id: reviewForm.employee_id,
          reviewer_id: reviewForm.reviewer_id || undefined,
        });
      }
      setShowReviewModal(false);
      setReviewingItem(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save review.");
    }
  };

  // Filtered Goals
  const filteredGoals = goals.filter((g) => {
    const empName = getEmployeeName(g.employee_id).toLowerCase();
    const titleMatches = g.title.toLowerCase().includes(searchTerm.toLowerCase());
    const empMatches = empName.includes(searchTerm.toLowerCase());
    const cycleMatches = selectedCycleFilter === "all" || g.cycle_id === selectedCycleFilter;
    const statusMatches = statusFilter === "all" || g.status === statusFilter;
    return (titleMatches || empMatches) && cycleMatches && statusMatches;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Performance & OKRs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track strategic enterprise objectives, quarterly cycles, and 360 employee appraisals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {activeTab === "goals" && (
            <button
              onClick={() => {
                setEditingGoal(null);
                setGoalForm({
                  employee_id: employees[0]?.id || "",
                  cycle_id: cycles[0]?.id || "",
                  title: "",
                  description: "",
                  metric_kpi: "Completion %",
                  target_value: "100%",
                  current_value: "0%",
                  weightage: 25,
                });
                setShowGoalModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add OKR Goal
            </button>
          )}
          {activeTab === "cycles" && (
            <button
              onClick={() => setShowCycleModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Cycle
            </button>
          )}
          {activeTab === "reviews" && (
            <button
              onClick={() => {
                setReviewingItem(null);
                setReviewForm({
                  cycle_id: cycles[0]?.id || "",
                  employee_id: employees[0]?.id || "",
                  reviewer_id: "",
                  manager_rating: 4,
                  manager_feedback: "",
                  status: "completed",
                });
                setShowReviewModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Initiate Review
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg OKR Progress</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{avgProgress}%</p>
            <p className="text-xs text-indigo-600 font-medium mt-1">Across all enterprise goals</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Objectives</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalGoals}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">{achievedGoals} achieved successfully</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Target className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Cycles</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{activeCycles}</p>
            <p className="text-xs text-blue-600 font-medium mt-1">Evaluation periods open</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reviews Conducted</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{reviews.length}</p>
            <p className="text-xs text-amber-600 font-medium mt-1">360 Evaluations logged</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("goals")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "goals"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Target className="w-4 h-4" />
          OKRs & Goals ({goals.length})
        </button>
        <button
          onClick={() => setActiveTab("cycles")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "cycles"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Review Cycles ({cycles.length})
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "reviews"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Appraisals & Reviews ({reviews.length})
        </button>
      </div>

      {/* TAB CONTENT: GOALS */}
      {activeTab === "goals" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search goals or employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedCycleFilter}
                onChange={(e) => setSelectedCycleFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Cycles</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="achieved">Achieved</option>
                <option value="missed">Missed</option>
              </select>
            </div>
          </div>

          {/* Goals List */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading goals and metrics...</div>
          ) : filteredGoals.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-700">No performance goals found</p>
              <p className="text-sm text-slate-400 mt-1">Get started by creating your team's key results and OKRs.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGoals.map((g) => (
                <div key={g.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-indigo-200 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            g.status === "achieved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : g.status === "in_progress"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {g.status.replace("_", " ").toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Weight: {g.weightage}%</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1.5">{g.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Assigned to: <strong className="text-slate-700">{getEmployeeName(g.employee_id)}</strong></p>
                      <p className="text-xs text-slate-400 mt-0.5">Cycle: {getCycleTitle(g.cycle_id)}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingGoal(g);
                          setGoalForm({
                            employee_id: g.employee_id,
                            cycle_id: g.cycle_id || "",
                            title: g.title,
                            description: g.description || "",
                            metric_kpi: g.metric_kpi || "",
                            target_value: g.target_value || "",
                            current_value: g.current_value || "",
                            weightage: g.weightage,
                          });
                          setShowGoalModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50"
                        title="Edit Details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {g.description && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{g.description}</p>}

                  {/* Progress Section */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                      <span className="text-slate-500">
                        Target: <strong className="text-slate-800">{g.metric_kpi || "Target"} ({g.target_value || "100%"})</strong>
                      </span>
                      <span className="text-indigo-600 font-bold">{g.progress_percentage}%</span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          g.progress_percentage >= 100
                            ? "bg-emerald-500"
                            : g.progress_percentage > 50
                            ? "bg-indigo-600"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(g.progress_percentage, 100)}%` }}
                      />
                    </div>

                    {/* Quick Progress Increment Buttons */}
                    <div className="flex items-center justify-between gap-1 mt-3">
                      <span className="text-[11px] text-slate-400">Quick Update:</span>
                      <div className="flex items-center gap-1.5">
                        {[25, 50, 75, 100].map((val) => (
                          <button
                            key={val}
                            onClick={() => handleUpdateProgress(g, val)}
                            className={`px-2 py-0.5 text-[11px] rounded font-medium border ${
                              g.progress_percentage === val
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {val}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: CYCLES */}
      {activeTab === "cycles" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Performance Cycles</h2>
            <span className="text-xs text-slate-500">Evaluation & appraisal scheduling windows</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Cycle Title</th>
                  <th className="px-6 py-3">Start Date</th>
                  <th className="px-6 py-3">End Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Linked Goals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cycles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No appraisal cycles defined yet.
                    </td>
                  </tr>
                ) : (
                  cycles.map((c) => {
                    const cycleGoals = goals.filter((g) => g.cycle_id === c.id);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">{c.title}</td>
                        <td className="px-6 py-4">{c.start_date}</td>
                        <td className="px-6 py-4">{c.end_date}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                              c.status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : c.status === "completed"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                            {cycleGoals.length} Goals
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

      {/* TAB CONTENT: REVIEWS */}
      {activeTab === "reviews" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Appraisals & Performance Ratings</h2>
            <span className="text-xs text-slate-500">Evaluations with 1-5 star ratings & feedback</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Cycle</th>
                  <th className="px-6 py-3">Manager Rating</th>
                  <th className="px-6 py-3">Feedback</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No performance reviews recorded yet. Click "Initiate Review" to evaluate an employee.
                    </td>
                  </tr>
                ) : (
                  reviews.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{getEmployeeName(r.employee_id)}</td>
                      <td className="px-6 py-4">{getCycleTitle(r.cycle_id)}</td>
                      <td className="px-6 py-4">
                        {r.manager_rating ? (
                          <div className="flex items-center gap-1 text-amber-500">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= r.manager_rating! ? "fill-amber-400 text-amber-400" : "text-slate-200"
                                }`}
                              />
                            ))}
                            <span className="text-xs font-bold text-slate-700 ml-1">({r.manager_rating}/5)</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not rated</span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate text-xs text-slate-600">
                        {r.manager_feedback || r.self_feedback || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                            r.status === "completed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setReviewingItem(r);
                            setReviewForm({
                              cycle_id: r.cycle_id,
                              employee_id: r.employee_id,
                              reviewer_id: r.reviewer_id || "",
                              manager_rating: r.manager_rating || 4,
                              manager_feedback: r.manager_feedback || "",
                              status: "completed",
                            });
                            setShowReviewModal(true);
                          }}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-md"
                        >
                          Rate / Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT GOAL */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingGoal ? "Edit OKR Goal" : "Create New OKR Goal"}
              </h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Employee *</label>
                <select
                  required
                  disabled={!!editingGoal}
                  value={goalForm.employee_id}
                  onChange={(e) => setGoalForm({ ...goalForm, employee_id: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name || ""} ({e.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Appraisal Cycle</label>
                <select
                  value={goalForm.cycle_id}
                  onChange={(e) => setGoalForm({ ...goalForm, cycle_id: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">None / Ongoing</option>
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Goal / Objective Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Kubernetes migration with 99.9% uptime"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Key Results</label>
                <textarea
                  rows={2}
                  placeholder="Specific deliverables and milestone criteria..."
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Metric KPI</label>
                  <input
                    type="text"
                    placeholder="Uptime %"
                    value={goalForm.metric_kpi}
                    onChange={(e) => setGoalForm({ ...goalForm, metric_kpi: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Value</label>
                  <input
                    type="text"
                    placeholder="99.9%"
                    value={goalForm.target_value}
                    onChange={(e) => setGoalForm({ ...goalForm, target_value: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Weightage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={goalForm.weightage}
                    onChange={(e) => setGoalForm({ ...goalForm, weightage: Number(e.target.value) })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm"
                >
                  {editingGoal ? "Save Changes" : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CYCLE */}
      {showCycleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">New Performance Cycle</h3>
              <button
                onClick={() => setShowCycleModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCycle} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cycle Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 2026 Appraisal & Review"
                  value={cycleForm.title}
                  onChange={(e) => setCycleForm({ ...cycleForm, title: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={cycleForm.start_date}
                    onChange={(e) => setCycleForm({ ...cycleForm, start_date: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={cycleForm.end_date}
                    onChange={(e) => setCycleForm({ ...cycleForm, end_date: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={cycleForm.status}
                  onChange={(e) => setCycleForm({ ...cycleForm, status: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  <option value="active">Active (Open for Goals & Reviews)</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed / Archived</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCycleModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm"
                >
                  Launch Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT / EDIT REVIEW */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {reviewingItem ? "Complete Employee Appraisal" : "Initiate Review"}
              </h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee *</label>
                <select
                  required
                  disabled={!!reviewingItem}
                  value={reviewForm.employee_id}
                  onChange={(e) => setReviewForm({ ...reviewForm, employee_id: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name || ""} ({e.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Appraisal Cycle *</label>
                <select
                  required
                  disabled={!!reviewingItem}
                  value={reviewForm.cycle_id}
                  onChange={(e) => setReviewForm({ ...reviewForm, cycle_id: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Manager Rating (1 to 5 Stars) *
                </label>
                <div className="flex items-center gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewForm({ ...reviewForm, manager_rating: star })}
                      className="p-1 focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= reviewForm.manager_rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-slate-200 hover:text-amber-200"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-bold text-slate-700 ml-2">
                    {reviewForm.manager_rating} / 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Manager Feedback & Recommendations
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Key strengths, impact on enterprise goals, areas for leadership growth..."
                  value={reviewForm.manager_feedback}
                  onChange={(e) => setReviewForm({ ...reviewForm, manager_feedback: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm"
                >
                  Submit Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
