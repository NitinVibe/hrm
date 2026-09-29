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

export async function getShifts(): Promise<Shift[]> {
  const response = await api.get<Shift[]>("/shifts");
  return response.data;
}
