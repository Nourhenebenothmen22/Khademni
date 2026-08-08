import { apiRequest } from "@/lib/api/client";
import { ApiResponse, AuditLog, DashboardStats } from "@/types/backend";

export interface AuditLogQueryFilters {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export async function fetchAuditLogs(filters: AuditLogQueryFilters = {}): Promise<ApiResponse<AuditLog[]>> {
  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.set("page", String(filters.page));
  if (filters.limit) queryParams.set("limit", String(filters.limit));
  if (filters.userId) queryParams.set("userId", filters.userId);
  if (filters.action) queryParams.set("action", filters.action);
  if (filters.entityType) queryParams.set("entityType", filters.entityType);
  if (filters.entityId) queryParams.set("entityId", filters.entityId);
  if (filters.startDate) queryParams.set("startDate", filters.startDate);
  if (filters.endDate) queryParams.set("endDate", filters.endDate);
  if (filters.sortBy) queryParams.set("sortBy", filters.sortBy);
  if (filters.sortOrder) queryParams.set("sortOrder", filters.sortOrder);

  const queryStr = queryParams.toString();
  return apiRequest<AuditLog[]>(`/admin/audit-logs${queryStr ? `?${queryStr}` : ""}`);
}

export async function fetchAdminDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  return apiRequest<DashboardStats>("/admin/stats");
}
