import api from "./client";

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  city: string | null;
  state: string | null;
  country: string;
  address: string | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BranchPayload {
  name: string;
  code: string;
  city?: string | null;
  state?: string | null;
  country?: string;
  address?: string | null;
  timezone?: string;
  is_active?: boolean;
}

export async function getBranches(): Promise<Branch[]> {
  const res = await api.get<Branch[]>("/branches");
  return res.data;
}

export async function createBranch(payload: BranchPayload): Promise<Branch> {
  const res = await api.post<Branch>("/branches", payload);
  return res.data;
}

export async function updateBranch(id: string, payload: Partial<BranchPayload>): Promise<Branch> {
  const res = await api.patch<Branch>(`/branches/${id}`, payload);
  return res.data;
}

export async function deactivateBranch(id: string): Promise<Branch> {
  const res = await api.delete<Branch>(`/branches/${id}`);
  return res.data;
}
