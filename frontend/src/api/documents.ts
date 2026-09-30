import api from "./client";

export interface DocumentRecord {
  id: string;
  organization_id: string;
  employee_id: string | null;
  title: string;
  category: "identity" | "offer_letter" | "contract" | "policy" | "certificate" | "other";
  file_url: string;
  file_size_kb: number;
  expiry_date: string | null;
  verification_status: "pending" | "verified" | "rejected";
  uploaded_at: string;
}

export async function getDocuments(params?: { employee_id?: string; category?: string }): Promise<DocumentRecord[]> {
  const res = await api.get<DocumentRecord[]>("/documents", { params });
  return res.data;
}

export async function createDocument(payload: {
  title: string;
  category: string;
  file_url: string;
  file_size_kb?: number;
  employee_id?: string | null;
  expiry_date?: string | null;
}): Promise<DocumentRecord> {
  const res = await api.post<DocumentRecord>("/documents", payload);
  return res.data;
}

export async function verifyDocument(id: string, verification_status: "verified" | "rejected"): Promise<DocumentRecord> {
  const res = await api.patch<DocumentRecord>(`/documents/${id}/verify`, { verification_status });
  return res.data;
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}
