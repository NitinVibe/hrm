import api from "./client";

export interface PerformanceCycle {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "completed";
}

export interface Goal {
  id: string;
  employee_id: string;
  cycle_id: string | null;
  title: string;
  description: string | null;
  metric_kpi: string | null;
  target_value: string | null;
  current_value: string | null;
  progress_percentage: number;
  weightage: number;
  status: "not_started" | "in_progress" | "achieved" | "missed";
}

export interface PerformanceReview {
  id: string;
  cycle_id: string;
  employee_id: string;
  reviewer_id: string | null;
  self_rating: number | null;
  manager_rating: number | null;
  final_rating: number | null;
  self_feedback: string | null;
  manager_feedback: string | null;
  status: "draft" | "submitted" | "completed";
}

export async function getPerformanceCycles(): Promise<PerformanceCycle[]> {
  const res = await api.get<PerformanceCycle[]>("/performance/cycles");
  return res.data;
}

export async function createPerformanceCycle(payload: { title: string; start_date: string; end_date: string; status?: string }): Promise<PerformanceCycle> {
  const res = await api.post<PerformanceCycle>("/performance/cycles", payload);
  return res.data;
}

export async function getGoals(params?: { employee_id?: string; cycle_id?: string }): Promise<Goal[]> {
  const res = await api.get<Goal[]>("/performance/goals", { params });
  return res.data;
}

export async function createGoal(payload: {
  employee_id: string;
  cycle_id?: string | null;
  title: string;
  description?: string;
  metric_kpi?: string;
  target_value?: string;
  current_value?: string;
  weightage?: number;
}): Promise<Goal> {
  const res = await api.post<Goal>("/performance/goals", payload);
  return res.data;
}

export async function updateGoal(id: string, payload: Partial<Goal>): Promise<Goal> {
  const res = await api.patch<Goal>(`/performance/goals/${id}`, payload);
  return res.data;
}

export async function deleteGoal(id: string): Promise<void> {
  await api.delete(`/performance/goals/${id}`);
}

export async function getPerformanceReviews(params?: { cycle_id?: string; employee_id?: string }): Promise<PerformanceReview[]> {
  const res = await api.get<PerformanceReview[]>("/performance/reviews", { params });
  return res.data;
}

export async function createPerformanceReview(payload: {
  cycle_id: string;
  employee_id: string;
  reviewer_id?: string | null;
  self_rating?: number;
  self_feedback?: string;
}): Promise<PerformanceReview> {
  const res = await api.post<PerformanceReview>("/performance/reviews", payload);
  return res.data;
}

export async function updatePerformanceReview(id: string, payload: Partial<PerformanceReview>): Promise<PerformanceReview> {
  const res = await api.patch<PerformanceReview>(`/performance/reviews/${id}`, payload);
  return res.data;
}
