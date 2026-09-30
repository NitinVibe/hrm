import api from "./client";

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export async function getAuditLogs(params?: {
  action?: string;
  entity_type?: string;
  user_id?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLog[]> {
  const res = await api.get<AuditLog[]>("/audit-logs", { params });
  return res.data;
}
