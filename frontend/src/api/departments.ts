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

export async function getDepartments(): Promise<Department[]> {
  const response = await api.get<Department[]>("/departments");
  return response.data;
}
