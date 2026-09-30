import React, { useEffect, useState } from "react";
import {
  Briefcase,
  Users,
  Calendar,
  UserCheck,
  Plus,
  Search,
  CheckCircle2,
  FileText,
  RefreshCw,
  X,
  MapPin,
} from "lucide-react";
import {
  type JobOpening,
  type Candidate,
  type Interview,
  getJobs,
  createJob,
  getCandidates,
  createCandidate,
  updateCandidateStage,
  convertCandidateToEmployee,
  getInterviews,
  scheduleInterview,
} from "../api/recruitment";
import { getDepartments, type Department } from "../api/departments";
import { getDesignations, type Designation } from "../api/designations";
import { getShifts, type Shift } from "../api/shifts";
import { getBranches, type Branch } from "../api/branches";

const STAGES = [
  { key: "applied", label: "Applied", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "screening", label: "Screening", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "interview", label: "Interview", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "offer", label: "Offer Made", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { key: "hired", label: "Hired", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { key: "rejected", label: "Rejected", color: "bg-rose-50 text-rose-700 border-rose-200" },
];

export default function Recruitment() {
  const [activeTab, setActiveTab] = useState<"pipeline" | "jobs" | "interviews">("pipeline");
  const [loading, setLoading] = useState(true);

  // Data
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("all");

  // Modals
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showHireModal, setShowHireModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // Forms
  const [jobForm, setJobForm] = useState({
    title: "",
    department_id: "",
    location: "Headquarters",
    employment_type: "Full-Time",
    open_positions: 1,
    status: "published" as const,
    description: "",
    requirements: "",
  });

  const [candidateForm, setCandidateForm] = useState({
    job_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    resume_url: "",
    notes: "",
  });

  const [interviewForm, setInterviewForm] = useState({
    candidate_id: "",
    round_name: "Technical Assessment",
    scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  });

  const [hireForm, setHireForm] = useState({
    department_id: "",
    designation_id: "",
    shift_id: "",
    branch_id: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [j, c, i, dept, desig, s, b] = await Promise.all([
        getJobs(),
        getCandidates(),
        getInterviews(),
        getDepartments(),
        getDesignations(),
        getShifts(),
        getBranches(),
      ]);
      setJobs(j);
      setCandidates(c);
      setInterviews(i);
      setDepartments(dept);
      setDesignations(desig);
      setShifts(s);
      setBranches(b);
    } catch (err) {
      console.error("Failed to load recruitment data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getJobTitle = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    return job ? job.title : "General";
  };

  const getCandidateName = (id: string) => {
    const cand = candidates.find((c) => c.id === id);
    return cand ? `${cand.first_name} ${cand.last_name || ""}` : id.slice(0, 8);
  };

  // Actions
  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createJob({
        ...jobForm,
        open_positions: Number(jobForm.open_positions),
      });
      setShowJobModal(false);
      setJobForm({
        title: "",
        department_id: "",
        location: "Headquarters",
        employment_type: "Full-Time",
        open_positions: 1,
        status: "published",
        description: "",
        requirements: "",
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create job.");
    }
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCandidate(candidateForm);
      setShowCandidateModal(false);
      setCandidateForm({
        job_id: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        resume_url: "",
        notes: "",
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add candidate.");
    }
  };

  const handleStageChange = async (candidateId: string, newStage: string) => {
    try {
      await updateCandidateStage(candidateId, newStage);
      fetchData();
    } catch (err: any) {
      alert("Failed to update candidate stage.");
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await scheduleInterview(interviewForm);
      setShowInterviewModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to schedule interview.");
    }
  };

  const handleConvertCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    try {
      const res = await convertCandidateToEmployee(selectedCandidate.id, {
        department_id: hireForm.department_id || undefined,
        designation_id: hireForm.designation_id || undefined,
        shift_id: hireForm.shift_id || undefined,
        branch_id: hireForm.branch_id || undefined,
      });
      alert(res.message || "Candidate successfully onboarded as employee!");
      setShowHireModal(false);
      setSelectedCandidate(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to convert candidate.");
    }
  };

  // Metrics
  const activeJobs = jobs.filter((j) => j.status === "published").length;
  const totalCandidates = candidates.length;
  const inInterview = candidates.filter((c) => c.stage === "interview").length;
  const hiredCount = candidates.filter((c) => c.stage === "hired").length;

  const filteredCandidates = candidates.filter((c) => {
    const name = `${c.first_name} ${c.last_name || ""}`.toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesJob = selectedJobFilter === "all" || c.job_id === selectedJobFilter;
    return matchesSearch && matchesJob;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recruitment & ATS</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage open requisitions, candidate pipeline, interview scheduling, and 1-click hire onboarding.
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
          <button
            onClick={() => {
              setCandidateForm({
                job_id: jobs[0]?.id || "",
                first_name: "",
                last_name: "",
                email: "",
                phone: "",
                resume_url: "",
                notes: "",
              });
              setShowCandidateModal(true);
            }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors border border-slate-200"
          >
            <Plus className="w-4 h-4" />
            Add Candidate
          </button>
          <button
            onClick={() => setShowJobModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Post Requisition
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Openings</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{activeJobs}</p>
            <p className="text-xs text-indigo-600 font-medium mt-1">Published requisitions</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Applicants</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCandidates}</p>
            <p className="text-xs text-blue-600 font-medium mt-1">In ATS pipeline</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Interviews Active</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{inInterview}</p>
            <p className="text-xs text-amber-600 font-medium mt-1">Undergoing rounds</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hired & Onboarded</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{hiredCount}</p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Converted to full employees</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "pipeline"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Candidate Pipeline ({candidates.length})
        </button>
        <button
          onClick={() => setActiveTab("jobs")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "jobs"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Job Openings ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab("interviews")}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "interviews"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Interviews ({interviews.length})
        </button>
      </div>

      {/* TAB 1: KANBAN / CANDIDATE PIPELINE */}
      {activeTab === "pipeline" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidates by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-medium text-slate-500">Filter Requisition:</label>
              <select
                value={selectedJobFilter}
                onChange={(e) => setSelectedJobFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Requisitions ({jobs.length})</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pipeline Columns */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              Loading ATS candidate pipeline...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {STAGES.map((stage) => {
              const stageCandidates = filteredCandidates.filter((c) => c.stage === stage.key);
              return (
                <div key={stage.key} className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 flex flex-col min-h-[450px]">
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{stage.label}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                      {stageCandidates.length}
                    </span>
                  </div>

                  {/* Candidate Cards */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto">
                    {stageCandidates.map((cand) => (
                      <div
                        key={cand.id}
                        className="bg-white rounded-lg p-3 border border-slate-200 shadow-xs hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {cand.first_name} {cand.last_name || ""}
                          </h4>
                        </div>
                        <p className="text-[11px] text-indigo-600 font-semibold mt-0.5 truncate">{getJobTitle(cand.job_id)}</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{cand.email}</p>
                        {cand.phone && <p className="text-[10px] text-slate-400 mt-0.5">{cand.phone}</p>}

                        {cand.resume_url && (
                          <a
                            href={cand.resume_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium mt-2"
                          >
                            <FileText className="w-3 h-3" />
                            View Resume
                          </a>
                        )}

                        {/* Move Stage Selector */}
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                          <select
                            value={cand.stage}
                            onChange={(e) => handleStageChange(cand.id, e.target.value)}
                            className="text-[10px] font-semibold bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:ring-1 focus:ring-indigo-500"
                          >
                            {STAGES.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.label}
                              </option>
                            ))}
                          </select>

                          {/* Quick Convert Button */}
                          {cand.stage !== "hired" && (
                            <button
                              onClick={() => {
                                setSelectedCandidate(cand);
                                setHireForm({
                                  department_id: departments[0]?.id || "",
                                  designation_id: designations[0]?.id || "",
                                  shift_id: shifts[0]?.id || "",
                                  branch_id: branches[0]?.id || "",
                                });
                                setShowHireModal(true);
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded transition-colors"
                              title="Convert to Full-time Employee"
                            >
                              Hire
                            </button>
                          )}
                          {cand.stage === "hired" && (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              Hired
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* TAB 2: JOB OPENINGS TABLE */}
      {activeTab === "jobs" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Job Requisitions</h2>
            <span className="text-xs text-slate-500">Corporate openings and talent positions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Job Title</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Openings</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Applicants</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No requisitions posted. Click "Post Requisition" to open a hiring search.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => {
                    const applicants = candidates.filter((c) => c.job_id === job.id);
                    return (
                      <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{job.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{job.description || "General opening"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 text-xs text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {job.location || "Remote"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium">{job.employment_type}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{job.open_positions}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                              job.status === "published"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : job.status === "closed"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {job.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
                            {applicants.length} Candidates
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

      {/* TAB 3: INTERVIEWS TABLE */}
      {activeTab === "interviews" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Interview Schedule</h2>
            <button
              onClick={() => {
                setInterviewForm({
                  candidate_id: candidates[0]?.id || "",
                  round_name: "Technical Assessment",
                  scheduled_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                });
                setShowInterviewModal(true);
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Interview
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Candidate</th>
                  <th className="px-6 py-3">Round</th>
                  <th className="px-6 py-3">Scheduled At</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Feedback / Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interviews.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No interviews scheduled yet.
                    </td>
                  </tr>
                ) : (
                  interviews.map((iv) => (
                    <tr key={iv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{getCandidateName(iv.candidate_id)}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">{iv.round_name}</td>
                      <td className="px-6 py-4 text-xs">
                        {new Date(iv.scheduled_at).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                            iv.status === "completed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : iv.status === "cancelled"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {iv.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {iv.feedback || (iv.rating ? `Rated: ${iv.rating}/5` : "Awaiting evaluation")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: POST REQUISITION */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Post Job Requisition</h3>
              <button
                onClick={() => setShowJobModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Backend Engineer"
                  value={jobForm.title}
                  onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={jobForm.department_id}
                    onChange={(e) => setJobForm({ ...jobForm, department_id: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={jobForm.employment_type}
                    onChange={(e) => setJobForm({ ...jobForm, employment_type: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Open Positions *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={jobForm.open_positions}
                    onChange={(e) => setJobForm({ ...jobForm, open_positions: Number(e.target.value) })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Description</label>
                <textarea
                  rows={2}
                  placeholder="Key responsibilities and day-to-day work..."
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm"
                >
                  Publish Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CANDIDATE */}
      {showCandidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add Candidate</h3>
              <button
                onClick={() => setShowCandidateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCandidate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Requisition *</label>
                <select
                  required
                  value={candidateForm.job_id}
                  onChange={(e) => setCandidateForm({ ...candidateForm, job_id: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  <option value="">Select Job</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={candidateForm.first_name}
                    onChange={(e) => setCandidateForm({ ...candidateForm, first_name: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={candidateForm.last_name}
                    onChange={(e) => setCandidateForm({ ...candidateForm, last_name: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={candidateForm.email}
                  onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={candidateForm.phone}
                  onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Resume Link / Portfolio</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/... or drive link"
                  value={candidateForm.resume_url}
                  onChange={(e) => setCandidateForm({ ...candidateForm, resume_url: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCandidateModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm"
                >
                  Add Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SCHEDULE INTERVIEW */}
      {showInterviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Schedule Interview Round</h3>
              <button
                onClick={() => setShowInterviewModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleInterview} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Candidate *</label>
                <select
                  required
                  value={interviewForm.candidate_id}
                  onChange={(e) => setInterviewForm({ ...interviewForm, candidate_id: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name || ""} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Round Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. System Design & Architectural Coding"
                  value={interviewForm.round_name}
                  onChange={(e) => setInterviewForm({ ...interviewForm, round_name: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={interviewForm.scheduled_at}
                  onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_at: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInterviewModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm"
                >
                  Book Interview
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: 1-CLICK CONVERT TO EMPLOYEE */}
      {showHireModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Onboard Candidate as Employee</h3>
                <p className="text-xs text-slate-500">
                  {selectedCandidate.first_name} {selectedCandidate.last_name || ""} ({selectedCandidate.email})
                </p>
              </div>
              <button
                onClick={() => setShowHireModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertCandidate} className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2 border border-emerald-200">
                <UserCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  Converting will generate an official employee code, create a permanent profile, and update their stage to <strong>HIRED</strong>.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={hireForm.department_id}
                  onChange={(e) => setHireForm({ ...hireForm, department_id: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                <select
                  value={hireForm.designation_id}
                  onChange={(e) => setHireForm({ ...hireForm, designation_id: e.target.value })}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                >
                  <option value="">Select Designation</option>
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shift</label>
                  <select
                    value={hireForm.shift_id}
                    onChange={(e) => setHireForm({ ...hireForm, shift_id: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Shift</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Branch</label>
                  <select
                    value={hireForm.branch_id}
                    onChange={(e) => setHireForm({ ...hireForm, branch_id: e.target.value })}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHireModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm"
                >
                  Complete Onboarding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
