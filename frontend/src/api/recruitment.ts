import api from "./client";

export interface JobOpening {
  id: string;
  title: string;
  department_id: string | null;
  location: string | null;
  employment_type: string;
  open_positions: number;
  status: "draft" | "published" | "closed";
  description: string | null;
  requirements: string | null;
}

export interface Candidate {
  id: string;
  job_id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  resume_url: string | null;
  stage: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
  applied_at: string;
  notes: string | null;
}

export interface Interview {
  id: string;
  candidate_id: string;
  interviewer_id: string | null;
  round_name: string;
  scheduled_at: string;
  status: "scheduled" | "completed" | "cancelled";
  rating: number | null;
  feedback: string | null;
}

export async function getJobs(): Promise<JobOpening[]> {
  const res = await api.get<JobOpening[]>("/recruitment/jobs");
  return res.data;
}

export async function createJob(payload: Partial<JobOpening>): Promise<JobOpening> {
  const res = await api.post<JobOpening>("/recruitment/jobs", payload);
  return res.data;
}

export async function updateJob(id: string, payload: Partial<JobOpening>): Promise<JobOpening> {
  const res = await api.patch<JobOpening>(`/recruitment/jobs/${id}`, payload);
  return res.data;
}

export async function getCandidates(params?: { job_id?: string; stage?: string }): Promise<Candidate[]> {
  const res = await api.get<Candidate[]>("/recruitment/candidates", { params });
  return res.data;
}

export async function createCandidate(payload: {
  job_id: string;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  resume_url?: string;
  notes?: string;
}): Promise<Candidate> {
  const res = await api.post<Candidate>("/recruitment/candidates", payload);
  return res.data;
}

export async function updateCandidateStage(id: string, stage: string, notes?: string): Promise<Candidate> {
  const res = await api.patch<Candidate>(`/recruitment/candidates/${id}/stage`, { stage, notes });
  return res.data;
}

export async function convertCandidateToEmployee(
  id: string,
  payload: { department_id?: string; designation_id?: string; shift_id?: string; branch_id?: string }
): Promise<any> {
  const res = await api.post(`/recruitment/candidates/${id}/convert-to-employee`, payload);
  return res.data;
}

export async function getInterviews(candidate_id?: string): Promise<Interview[]> {
  const res = await api.get<Interview[]>("/recruitment/interviews", { params: { candidate_id } });
  return res.data;
}

export async function scheduleInterview(payload: {
  candidate_id: string;
  interviewer_id?: string;
  round_name: string;
  scheduled_at: string;
}): Promise<Interview> {
  const res = await api.post<Interview>("/recruitment/interviews", payload);
  return res.data;
}
