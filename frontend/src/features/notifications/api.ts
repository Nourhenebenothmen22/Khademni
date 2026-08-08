import { apiRequest } from "@/lib/api/client";
import { ApiResponse, Notification } from "@/types/backend";

export interface NotificationQueryFilters {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function fetchNotifications(filters: NotificationQueryFilters = {}): Promise<ApiResponse<Notification[]>> {
  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.set("page", String(filters.page));
  if (filters.limit) queryParams.set("limit", String(filters.limit));
  if (filters.isRead !== undefined) queryParams.set("isRead", String(filters.isRead));
  if (filters.type) queryParams.set("type", filters.type);
  if (filters.sortBy) queryParams.set("sortBy", filters.sortBy);
  if (filters.sortOrder) queryParams.set("sortOrder", filters.sortOrder);

  const queryStr = queryParams.toString();
  return apiRequest<Notification[]>(`/notifications${queryStr ? `?${queryStr}` : ""}`);
}

export async function fetchUnreadNotificationCount(): Promise<ApiResponse<{ unreadCount: number }>> {
  return apiRequest<{ unreadCount: number }>("/notifications/unread-count");
}

export async function markNotificationAsRead(id: string): Promise<ApiResponse<Notification>> {
  return apiRequest<Notification>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsAsRead(): Promise<ApiResponse<{ count: number }>> {
  return apiRequest<{ count: number }>("/notifications/read-all", {
    method: "PATCH",
  });
}

export async function deleteNotification(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/notifications/${id}`, {
    method: "DELETE",
  });
}
