import { apiRequest } from "@/lib/api/client";
import { ApiResponse, MatchingRun, ApplicationScore, MatchingQueueStatus } from "@/types/backend";

export interface TriggerMatchingRunPayload {
  applicationId: string;
  modelId?: string;
}

export interface MatchingRunsQueryFilters {
  page?: number;
  limit?: number;
  applicationId?: string;
  modelId?: string;
  status?: string;
}

export async function triggerMatchingRun(payload: TriggerMatchingRunPayload): Promise<ApiResponse<MatchingRun>> {
  return apiRequest<MatchingRun>("/matching/run", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function triggerJobMatchingRun(jobPostId: string, modelId?: string): Promise<ApiResponse<{ processedCount: number; runs: MatchingRun[] }>> {
  return apiRequest<{ processedCount: number; runs: MatchingRun[] }>(`/matching/run-job/${jobPostId}`, {
    method: "POST",
    body: JSON.stringify({ modelId }),
  });
}

export async function enqueueJobMatchingRun(jobPostId: string, modelId?: string): Promise<ApiResponse<{ queueJobId: string; message: string }>> {
  return apiRequest<{ queueJobId: string; message: string }>(`/matching/queue-job/${jobPostId}`, {
    method: "POST",
    body: JSON.stringify({ modelId }),
  });
}

export async function fetchMatchingQueueStatus(queueJobId: string): Promise<ApiResponse<MatchingQueueStatus>> {
  return apiRequest<MatchingQueueStatus>(`/matching/queue-status/${queueJobId}`);
}

export async function fetchMatchingRuns(filters: MatchingRunsQueryFilters = {}): Promise<ApiResponse<MatchingRun[]>> {
  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.set("page", String(filters.page));
  if (filters.limit) queryParams.set("limit", String(filters.limit));
  if (filters.applicationId) queryParams.set("applicationId", filters.applicationId);
  if (filters.modelId) queryParams.set("modelId", filters.modelId);
  if (filters.status) queryParams.set("status", filters.status);

  const queryStr = queryParams.toString();
  return apiRequest<MatchingRun[]>(`/matching/runs${queryStr ? `?${queryStr}` : ""}`);
}

export async function fetchMatchingRunById(id: string): Promise<ApiResponse<MatchingRun>> {
  return apiRequest<MatchingRun>(`/matching/runs/${id}`);
}

export async function fetchApplicationScore(applicationId: string): Promise<ApiResponse<ApplicationScore & { matchingRun: MatchingRun }>> {
  return apiRequest<ApplicationScore & { matchingRun: MatchingRun }>(`/matching/scores/${applicationId}`);
}
