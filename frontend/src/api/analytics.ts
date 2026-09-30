import api from "./client";

export interface AnalyticsDashboardData {
  workforce: {
    total: number;
    active: number;
    inactive: number;
    gender_breakdown: Record<string, number>;
    type_breakdown: Record<string, number>;
  };
  departments: Record<string, number>;
  branches: Record<string, number>;
  attendance: {
    total_30_days: number;
    on_time: number;
    late: number;
  };
  leaves: {
    pending: number;
    approved: number;
    rejected: number;
  };
  payroll: {
    latest_month: string;
    total_gross: number;
    total_net: number;
    total_deductions: number;
    status: string;
  };
  recruitment: {
    open_jobs: number;
    candidates_total: number;
    stages: Record<string, number>;
  };
  performance: {
    total: number;
    achieved: number;
    in_progress: number;
  };
}

export async function getAnalyticsDashboard(): Promise<AnalyticsDashboardData> {
  const res = await api.get<AnalyticsDashboardData>("/analytics/dashboard");
  return res.data;
}
