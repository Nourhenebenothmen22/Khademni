import { apiRequest, API_BASE_URL, getAccessToken, getActiveOrganizationId } from "@/lib/api/client";
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
  return `${API_BASE_URL}/applications/${applicationId}/documents/${docId}/download`;
}

/**
 * Authenticated document download.
 * The in-memory Bearer token cannot be sent via a plain <a href> navigation,
 * so this function fetches the file with the Authorization header and
 * triggers a browser save-dialog via a programmatic anchor click.
 */
export async function downloadDocumentBlob(
  applicationId: string,
  docId: string,
  filename: string,
): Promise<void> {
  const url = `${API_BASE_URL}/applications/${applicationId}/documents/${docId}/download`;
  const token = getAccessToken();
  const orgId = getActiveOrganizationId();

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (orgId) headers["X-Organization-Id"] = orgId;

  const res = await fetch(url, { headers, credentials: "include" });

  if (!res.ok) {
    throw new Error(`CV download failed: ${res.status} ${res.statusText}`);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
