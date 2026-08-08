import { apiRequest } from "@/lib/api/client";
import { ApiResponse, JobPost, JobKeyword, JobMatchingRule, KeywordType, RuleType, JobStatus } from "@/types/backend";

export interface JobQueryFilters {
  page?: number;
  limit?: number;
  status?: JobStatus;
  search?: string;
  createdById?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateJobPayload {
  title: string;
  description: string;
  requirements: string;
  deadline?: string;
  status?: JobStatus;
}

export interface UpdateJobPayload {
  title?: string;
  description?: string;
  requirements?: string;
  deadline?: string;
  status?: JobStatus;
}

export interface CreateKeywordPayload {
  keyword: string;
  type: KeywordType;
  weight?: number;
}

export interface CreateMatchingRulePayload {
  ruleName: string;
  type: RuleType;
  condition: Record<string, unknown>;
  weight?: number;
  isActive?: boolean;
}

export async function fetchJobs(filters: JobQueryFilters = {}): Promise<ApiResponse<JobPost[]>> {
  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.set("page", String(filters.page));
  if (filters.limit) queryParams.set("limit", String(filters.limit));
  if (filters.status) queryParams.set("status", filters.status);
  if (filters.search) queryParams.set("search", filters.search);
  if (filters.createdById) queryParams.set("createdById", filters.createdById);
  if (filters.sortBy) queryParams.set("sortBy", filters.sortBy);
  if (filters.sortOrder) queryParams.set("sortOrder", filters.sortOrder);

  const queryStr = queryParams.toString();
  return apiRequest<JobPost[]>(`/jobs${queryStr ? `?${queryStr}` : ""}`);
}

export async function fetchJobById(id: string): Promise<ApiResponse<JobPost>> {
  return apiRequest<JobPost>(`/jobs/${id}`);
}

export async function createJob(payload: CreateJobPayload): Promise<ApiResponse<JobPost>> {
  return apiRequest<JobPost>("/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateJob(id: string, payload: UpdateJobPayload): Promise<ApiResponse<JobPost>> {
  return apiRequest<JobPost>(`/jobs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteJob(id: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/jobs/${id}`, {
    method: "DELETE",
  });
}

// Keywords APIs
export async function fetchJobKeywords(jobPostId: string): Promise<ApiResponse<JobKeyword[]>> {
  return apiRequest<JobKeyword[]>(`/jobs/${jobPostId}/keywords`);
}

export async function addJobKeywords(jobPostId: string, keywords: CreateKeywordPayload[]): Promise<ApiResponse<JobKeyword[]>> {
  return apiRequest<JobKeyword[]>(`/jobs/${jobPostId}/keywords`, {
    method: "POST",
    body: JSON.stringify({ keywords }),
  });
}

export async function updateJobKeyword(jobPostId: string, keywordId: string, payload: Partial<CreateKeywordPayload>): Promise<ApiResponse<JobKeyword>> {
  return apiRequest<JobKeyword>(`/jobs/${jobPostId}/keywords/${keywordId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function removeJobKeyword(jobPostId: string, keywordId: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/jobs/${jobPostId}/keywords/${keywordId}`, {
    method: "DELETE",
  });
}

// Matching Rules APIs
export async function fetchJobMatchingRules(jobPostId: string): Promise<ApiResponse<JobMatchingRule[]>> {
  return apiRequest<JobMatchingRule[]>(`/jobs/${jobPostId}/rules`);
}

export async function addJobMatchingRule(jobPostId: string, payload: CreateMatchingRulePayload): Promise<ApiResponse<JobMatchingRule>> {
  return apiRequest<JobMatchingRule>(`/jobs/${jobPostId}/rules`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateJobMatchingRule(jobPostId: string, ruleId: string, payload: Partial<CreateMatchingRulePayload>): Promise<ApiResponse<JobMatchingRule>> {
  return apiRequest<JobMatchingRule>(`/jobs/${jobPostId}/rules/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function removeJobMatchingRule(jobPostId: string, ruleId: string): Promise<ApiResponse<{ message: string }>> {
  return apiRequest<{ message: string }>(`/jobs/${jobPostId}/rules/${ruleId}`, {
    method: "DELETE",
  });
}
