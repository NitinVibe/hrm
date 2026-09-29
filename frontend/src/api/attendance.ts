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

export async function getAttendance(params?: Record<string, string>): Promise<Attendance[]> {
  const response = await api.get<Attendance[]>("/attendance", { params });
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
