import { apiRequest } from "@/lib/api/client";
import { ApiResponse, Application, ApplicationStatus } from "@/types/backend";

export interface ApplicationQueryFilters {
  page?: number;
  limit?: number;
  status?: ApplicationStatus;
  jobPostId?: string;
  candidateId?: string;
  search?: string;
}

export interface UpdateApplicationStatusPayload {
  status: ApplicationStatus;
  reason?: string;
}

export async function applyToJob(jobId: string, file: File, motivationLetter?: string): Promise<ApiResponse<Application>> {
  const formData = new FormData();
  formData.append("file", file);
  if (motivationLetter) {
    formData.append("motivationLetter", motivationLetter);
  }

  return apiRequest<Application>(`/jobs/${jobId}/apply`, {
    method: "POST",
    body: formData,
  });
}

export async function fetchMyApplications(filters: ApplicationQueryFilters = {}): Promise<ApiResponse<Application[]>> {
  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.set("page", String(filters.page));
  if (filters.limit) queryParams.set("limit", String(filters.limit));
  if (filters.status) queryParams.set("status", filters.status);
  if (filters.search) queryParams.set("search", filters.search);

  const queryStr = queryParams.toString();
  return apiRequest<Application[]>(`/applications/me${queryStr ? `?${queryStr}` : ""}`);
}

export async function fetchAdminApplications(filters: ApplicationQueryFilters = {}): Promise<ApiResponse<Application[]>> {
  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.set("page", String(filters.page));
  if (filters.limit) queryParams.set("limit", String(filters.limit));
  if (filters.status) queryParams.set("status", filters.status);
  if (filters.jobPostId) queryParams.set("jobPostId", filters.jobPostId);
  if (filters.candidateId) queryParams.set("candidateId", filters.candidateId);
  if (filters.search) queryParams.set("search", filters.search);

  const queryStr = queryParams.toString();
  return apiRequest<Application[]>(`/applications${queryStr ? `?${queryStr}` : ""}`);
}

export async function updateApplicationStatus(id: string, payload: UpdateApplicationStatusPayload): Promise<ApiResponse<Application>> {
  return apiRequest<Application>(`/applications/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function withdrawApplication(id: string): Promise<ApiResponse<Application>> {
  return apiRequest<Application>(`/applications/${id}/withdraw`, {
    method: "POST",
  });
}

export async function deleteApplication(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/applications/${id}`, {
    method: "DELETE",
  });
}

export function getDocumentDownloadUrl(applicationId: string, docId: string): string {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
  return `${API_BASE_URL}/applications/${applicationId}/documents/${docId}/download`;
}
