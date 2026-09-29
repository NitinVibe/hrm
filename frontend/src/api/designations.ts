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

export async function getDesignations(): Promise<Designation[]> {
  const response = await api.get<Designation[]>("/designations");
  return response.data;
}
