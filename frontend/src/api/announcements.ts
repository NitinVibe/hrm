import api from "./client";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "normal" | "urgent";
  published_by_id: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "leave" | "attendance" | "payroll" | "general";
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const res = await api.get<Announcement[]>("/announcements");
  return res.data;
}

export async function createAnnouncement(payload: {
  title: string;
  content: string;
  priority?: "low" | "normal" | "urgent";
  expires_at?: string | null;
}): Promise<Announcement> {
  const res = await api.post<Announcement>("/announcements", payload);
  return res.data;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await api.delete(`/announcements/${id}`);
}

export async function getMyNotifications(): Promise<NotificationItem[]> {
  const res = await api.get<NotificationItem[]>("/notifications/me");
  return res.data;
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  const res = await api.patch<NotificationItem>(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/notifications/read-all");
}
