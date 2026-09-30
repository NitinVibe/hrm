import api from "./client";

export interface NotificationItem {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCount {
  unread_count: number;
}

export async function getNotifications(limit: number = 30): Promise<NotificationItem[]> {
  const response = await api.get<NotificationItem[]>("/notifications", { params: { limit } });
  return response.data;
}

export async function getUnreadCount(): Promise<number> {
  try {
    const response = await api.get<UnreadCount>("/notifications/unread-count");
    return response.data.unread_count;
  } catch {
    return 0;
  }
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
  const response = await api.patch<NotificationItem>(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/notifications/mark-all-read");
}
