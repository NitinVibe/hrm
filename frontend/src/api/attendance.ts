import api from "./client";

export interface Attendance {
  id: string;
  organization_id: string;
  employee_id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  late_minutes: number;
  working_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRegularization {
  id: string;
  organization_id: string;
  employee_id: string;
  attendance_date: string;
  requested_check_in: string | null;
  requested_check_out: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export async function getAttendance(params?: Record<string, string>): Promise<Attendance[]> {
  const response = await api.get<Attendance[]>("/attendance", { params });
  return response.data;
}

export async function checkInEmployee(employeeId: string): Promise<Attendance> {
  const response = await api.post<Attendance>(`/attendance/check-in/${employeeId}`);
  return response.data;
}

export async function checkOutEmployee(employeeId: string): Promise<Attendance> {
  const response = await api.post<Attendance>(`/attendance/check-out/${employeeId}`);
  return response.data;
}

export async function myCheckIn(): Promise<Attendance> {
  const response = await api.post<Attendance>("/attendance/me/check-in");
  return response.data;
}

export async function myCheckOut(): Promise<Attendance> {
  const response = await api.post<Attendance>("/attendance/me/check-out");
  return response.data;
}

export async function requestRegularization(payload: {
  attendance_date: string;
  requested_check_in?: string;
  requested_check_out?: string;
  reason: string;
}): Promise<AttendanceRegularization> {
  const res = await api.post<AttendanceRegularization>("/attendance/regularize", payload);
  return res.data;
}

export async function getRegularizations(status_filter?: string): Promise<AttendanceRegularization[]> {
  const res = await api.get<AttendanceRegularization[]>("/attendance/regularizations", {
    params: status_filter ? { status_filter } : undefined,
  });
  return res.data;
}

export async function approveRegularization(id: string): Promise<AttendanceRegularization> {
  const res = await api.patch<AttendanceRegularization>(`/attendance/regularizations/${id}/approve`);
  return res.data;
}

export async function rejectRegularization(id: string, rejection_reason?: string): Promise<AttendanceRegularization> {
  const res = await api.patch<AttendanceRegularization>(`/attendance/regularizations/${id}/reject`, {
    rejection_reason,
  });
  return res.data;
}
