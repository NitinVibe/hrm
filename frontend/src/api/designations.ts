import api from "./client";

export interface Designation {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DesignationPayload {
  name: string;
  description?: string | null;
}

export async function getDesignations(): Promise<Designation[]> {
  const response = await api.get<Designation[]>("/designations");
  return response.data;
}

export async function createDesignation(
  payload: DesignationPayload,
): Promise<Designation> {
  const response = await api.post<Designation>("/designations", payload);
  return response.data;
}

export async function updateDesignation(
  id: string,
  payload: DesignationPayload,
): Promise<Designation> {
  const response = await api.patch<Designation>(`/designations/${id}`, payload);
  return response.data;
}

export async function deactivateDesignation(id: string): Promise<Designation> {
  const response = await api.delete<Designation>(`/designations/${id}`);
  return response.data;
}
