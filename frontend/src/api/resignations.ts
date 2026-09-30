import client from "./client";

export interface Resignation {
  id: string;
  organization_id: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  resignation_date: string;
  proposed_last_working_day: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "withdrawn" | "completed";
  reviewed_by_id?: string | null;
  reviewed_at?: string | null;
  notice_period_days: number;
  final_last_working_day?: string | null;
  exit_interview_notes?: string | null;
  clearance_status: "pending" | "in_progress" | "completed";
  asset_returned: boolean;
  final_settlement_status: "pending" | "processed" | "paid";
  comments?: string | null;
  created_at: string;
  updated_at: string;
}

export async function submitResignation(data: {
  reason: string;
  proposed_last_working_day: string;
  resignation_date?: string;
}): Promise<Resignation> {
  const res = await client.post<Resignation>("/resignations", data);
  return res.data;
}

export async function getResignations(): Promise<Resignation[]> {
  const res = await client.get<Resignation[]>("/resignations");
  return res.data;
}

export async function reviewResignation(
  id: string,
  data: {
    status: string;
    notice_period_days?: number;
    final_last_working_day?: string;
    exit_interview_notes?: string;
    clearance_status?: string;
    asset_returned?: boolean;
    final_settlement_status?: string;
    comments?: string;
  }
): Promise<Resignation> {
  const res = await client.patch<Resignation>(`/resignations/${id}/review`, data);
  return res.data;
}

export async function completeEmployeeExit(id: string): Promise<Resignation> {
  const res = await client.post<Resignation>(`/resignations/${id}/complete-exit`);
  return res.data;
}
