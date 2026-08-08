import { apiRequest } from "@/lib/api/client";
import { ApiResponse, Organization } from "@/types/backend";

export interface OrganizationQueryFilters {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}

export interface CreateOrganizationPayload {
  name: string;
  slug: string;
  domain?: string;
  isActive?: boolean;
}

export async function fetchMyOrganization(): Promise<ApiResponse<Organization>> {
  return apiRequest<Organization>("/organizations/me");
}

export async function fetchOrganizations(filters: OrganizationQueryFilters = {}): Promise<ApiResponse<Organization[]>> {
  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.set("page", String(filters.page));
  if (filters.limit) queryParams.set("limit", String(filters.limit));
  if (filters.isActive !== undefined) queryParams.set("isActive", String(filters.isActive));
  if (filters.search) queryParams.set("search", filters.search);

  const queryStr = queryParams.toString();
  return apiRequest<Organization[]>(`/organizations${queryStr ? `?${queryStr}` : ""}`);
}

export async function fetchOrganizationById(id: string): Promise<ApiResponse<Organization>> {
  return apiRequest<Organization>(`/organizations/${id}`);
}

export async function createOrganization(payload: CreateOrganizationPayload): Promise<ApiResponse<Organization>> {
  return apiRequest<Organization>("/organizations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOrganization(id: string, payload: Partial<CreateOrganizationPayload>): Promise<ApiResponse<Organization>> {
  return apiRequest<Organization>(`/organizations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadOrganizationLogo(id: string, file: File): Promise<ApiResponse<Organization>> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<Organization>(`/organizations/${id}/logo`, {
    method: "POST",
    body: formData,
  });
}

export async function deleteOrganizationLogo(id: string): Promise<ApiResponse<Organization>> {
  return apiRequest<Organization>(`/organizations/${id}/logo`, {
    method: "DELETE",
  });
}
