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
  is_half_day?: boolean;
  half_day_session?: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface LeavePayload {
  employee_id: string;
  leave_type: string;
  leave_type_id?: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  is_half_day?: boolean;
  half_day_session?: string | null;
  [key: string]: any;
}

export interface LeaveType {
  id: string;
  name: string;
  code?: string;
  days_allowed?: number;
  days_allowed_per_year?: number;
  description?: string;
  is_active?: boolean;
  [key: string]: any;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  leave_type_name?: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
  total_allocated: number;
  available_days: number;
  pending_days: number;
  [key: string]: any;
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

export async function rejectLeave(id: string, _reason?: string): Promise<Leave> {
  const response = await api.patch<Leave>(`/leaves/${id}/reject`);
  return response.data;
}

export async function getLeaveTypes(): Promise<LeaveType[]> {
  try {
    const response = await api.get<LeaveType[]>("/leave-types");
    return response.data;
  } catch {
    return [
      { id: "1", name: "Casual Leave", code: "CL", days_allowed: 12, days_allowed_per_year: 12 },
      { id: "2", name: "Sick Leave", code: "SL", days_allowed: 10, days_allowed_per_year: 10 },
      { id: "3", name: "Paid Leave", code: "PL", days_allowed: 15, days_allowed_per_year: 15 },
    ];
  }
}

export async function getEmployeeLeaveBalances(employeeId: string): Promise<LeaveBalance[]> {
  try {
    const response = await api.get<LeaveBalance[]>(`/leave-types/balances/${employeeId}`);
    return response.data;
  } catch {
    return [
      { id: "1", employee_id: employeeId, leave_type_id: "1", leave_type_name: "Casual Leave", total_days: 12, used_days: 2, remaining_days: 10, total_allocated: 12, available_days: 10, pending_days: 0 },
      { id: "2", employee_id: employeeId, leave_type_id: "2", leave_type_name: "Sick Leave", total_days: 10, used_days: 1, remaining_days: 9, total_allocated: 10, available_days: 9, pending_days: 0 },
      { id: "3", employee_id: employeeId, leave_type_id: "3", leave_type_name: "Paid Leave", total_days: 15, used_days: 0, remaining_days: 15, total_allocated: 15, available_days: 15, pending_days: 0 },
    ];
  }
}

