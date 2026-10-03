import api from "./client";

export interface Team {
  id: string;
  organization_id: string;
  department_id?: string | null;
  manager_id?: string | null;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department_name?: string | null;
  manager_name?: string | null;
  member_count?: number;
}

export interface TeamPayload {
  name: string;
  department_id?: string | null;
  manager_id?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export async function getTeams(params?: {
  department_id?: string;
  is_active?: boolean;
}): Promise<Team[]> {
  const response = await api.get<Team[]>("/teams", { params });
  return response.data;
}

export async function getTeam(id: string): Promise<Team> {
  const response = await api.get<Team>(`/teams/${id}`);
  return response.data;
}

export async function createTeam(payload: TeamPayload): Promise<Team> {
  const response = await api.post<Team>("/teams", payload);
  return response.data;
}

export async function updateTeam(id: string, payload: Partial<TeamPayload>): Promise<Team> {
  const response = await api.patch<Team>(`/teams/${id}`, payload);
  return response.data;
}

export async function deleteTeam(id: string): Promise<void> {
  await api.delete(`/teams/${id}`);
}
