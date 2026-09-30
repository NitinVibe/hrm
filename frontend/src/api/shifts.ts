import api from "./client";

export interface Shift {
  id: string;
  organization_id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftPayload {
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes?: number;
  is_active?: boolean;
}

export async function getShifts(): Promise<Shift[]> {
  const response = await api.get<Shift[]>("/shifts");
  return response.data;
}

export async function createShift(payload: ShiftPayload): Promise<Shift> {
  const response = await api.post<Shift>("/shifts", payload);
  return response.data;
}

export async function updateShift(
  id: string,
  payload: Partial<ShiftPayload>,
): Promise<Shift> {
  const response = await api.patch<Shift>(`/shifts/${id}`, payload);
  return response.data;
}

export async function deactivateShift(id: string): Promise<Shift> {
  const response = await api.delete<Shift>(`/shifts/${id}`);
  return response.data;
}
