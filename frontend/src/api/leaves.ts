import api from "./client";

export interface Leave {
  id: string;
  organization_id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeavePayload {
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

export async function getLeaves(): Promise<Leave[]> {
  const response = await api.get<Leave[]>("/leaves");
  return response.data;
}

export async function createLeave(payload: LeavePayload): Promise<Leave> {
  const response = await api.post<Leave>("/leaves", payload);
  return response.data;
}

export async function approveLeave(id: string): Promise<Leave> {
  const response = await api.patch<Leave>(`/leaves/${id}/approve`);
  return response.data;
}

export async function rejectLeave(id: string): Promise<Leave> {
  const response = await api.patch<Leave>(`/leaves/${id}/reject`);
  return response.data;
}
