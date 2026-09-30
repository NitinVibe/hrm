import api from "./client";

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentPayload {
  name: string;
  description?: string | null;
}

export async function getDepartments(): Promise<Department[]> {
  const response = await api.get<Department[]>("/departments");
  return response.data;
}

export async function createDepartment(
  payload: DepartmentPayload,
): Promise<Department> {
  const response = await api.post<Department>("/departments", payload);
  return response.data;
}

export async function updateDepartment(
  id: string,
  payload: DepartmentPayload,
): Promise<Department> {
  const response = await api.patch<Department>(`/departments/${id}`, payload);
  return response.data;
}

export async function deactivateDepartment(id: string): Promise<Department> {
  const response = await api.delete<Department>(`/departments/${id}`);
  return response.data;
}
