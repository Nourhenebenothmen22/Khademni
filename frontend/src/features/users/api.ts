import { apiRequest } from "@/lib/api/client";
import { ApiResponse, User, UserRole } from "@/types/backend";

export interface UserQueryFilters {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface UpdateProfilePayload {
  fullName?: string;
}

export interface ChangePasswordPayload {
  currentPassword?: string;
  newPassword?: string;
}

export async function fetchMyProfile(): Promise<ApiResponse<User>> {
  return apiRequest<User>("/users/me");
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<ApiResponse<User>> {
  return apiRequest<User>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadUserAvatar(file: File): Promise<ApiResponse<User>> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<User>("/users/me/avatar", {
    method: "POST",
    body: formData,
  });
}

export async function deleteUserAvatar(): Promise<ApiResponse<User>> {
  return apiRequest<User>("/users/me/avatar", {
    method: "DELETE",
  });
}

export async function changePassword(payload: ChangePasswordPayload): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>("/users/me/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Admin Users Directory APIs
export async function fetchUsersList(filters: UserQueryFilters = {}): Promise<ApiResponse<User[]>> {
  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.set("page", String(filters.page));
  if (filters.limit) queryParams.set("limit", String(filters.limit));
  if (filters.role) queryParams.set("role", filters.role);
  if (filters.isActive !== undefined) queryParams.set("isActive", String(filters.isActive));
  if (filters.search) queryParams.set("search", filters.search);
  if (filters.sortBy) queryParams.set("sortBy", filters.sortBy);
  if (filters.sortOrder) queryParams.set("sortOrder", filters.sortOrder);

  const queryStr = queryParams.toString();
  return apiRequest<User[]>(`/admin/users${queryStr ? `?${queryStr}` : ""}`);
}

export async function fetchUserById(id: string): Promise<ApiResponse<User>> {
  return apiRequest<User>(`/admin/users/${id}`);
}

export async function toggleUserActive(id: string, isActive: boolean): Promise<ApiResponse<User>> {
  return apiRequest<User>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}
