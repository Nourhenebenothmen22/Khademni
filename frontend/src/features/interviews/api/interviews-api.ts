import { apiRequest, API_BASE_URL, getAccessToken, getActiveOrganizationId } from "@/lib/api/client";
import type {
  ApiResponse,
  Interview,
  InterviewStatus,
  InterviewType,
  MeetingProvider,
  ScorecardRecommendation,
  InterviewScorecard,
} from "@/types/backend";

export interface ScheduleInterviewPayload {
  applicationId: string;
  title: string;
  description?: string;
  type: InterviewType;
  startTime: string;
  endTime: string;
  timezone: string;
  meetingProvider: MeetingProvider;
  customMeetingUrl?: string;
  locationDetails?: string;
  interviewerIds: string[];
}

export interface RescheduleInterviewPayload {
  startTime: string;
  endTime: string;
  timezone?: string;
  reason?: string;
}

export interface CancelInterviewPayload {
  reason: string;
}

export interface SubmitScorecardPayload {
  recommendation: ScorecardRecommendation;
  overallNotes: string;
  criteriaScores?: Array<{
    category: string;
    criterion: string;
    score: number;
    comment?: string;
  }>;
}

export interface GetInterviewsQuery {
  page?: number;
  limit?: number;
  status?: InterviewStatus;
  candidateId?: string;
  jobPostId?: string;
  interviewerId?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: "startTime" | "createdAt" | "status";
  sortOrder?: "asc" | "desc";
}

export async function scheduleInterviewApi(
  payload: ScheduleInterviewPayload,
): Promise<ApiResponse<Interview>> {
  return apiRequest<Interview>("/interviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getInterviewsApi(
  query: GetInterviewsQuery = {},
): Promise<ApiResponse<Interview[]>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.status) params.set("status", query.status);
  if (query.candidateId) params.set("candidateId", query.candidateId);
  if (query.jobPostId) params.set("jobPostId", query.jobPostId);
  if (query.interviewerId) params.set("interviewerId", query.interviewerId);
  if (query.fromDate) params.set("fromDate", query.fromDate);
  if (query.toDate) params.set("toDate", query.toDate);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);

  const queryString = params.toString();
  return apiRequest<Interview[]>(`/interviews${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
  });
}

export async function getMyInterviewsApi(
  query: GetInterviewsQuery = {},
): Promise<ApiResponse<Interview[]>> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.status) params.set("status", query.status);

  const queryString = params.toString();
  return apiRequest<Interview[]>(`/interviews/me${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
  });
}

export async function getInterviewByIdApi(
  id: string,
): Promise<ApiResponse<Interview>> {
  return apiRequest<Interview>(`/interviews/${id}`, {
    method: "GET",
  });
}

export async function rescheduleInterviewApi(
  id: string,
  payload: RescheduleInterviewPayload,
): Promise<ApiResponse<Interview>> {
  return apiRequest<Interview>(`/interviews/${id}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function cancelInterviewApi(
  id: string,
  payload: CancelInterviewPayload,
): Promise<ApiResponse<Interview>> {
  return apiRequest<Interview>(`/interviews/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitScorecardApi(
  id: string,
  payload: SubmitScorecardPayload,
): Promise<ApiResponse<InterviewScorecard>> {
  return apiRequest<InterviewScorecard>(`/interviews/${id}/scorecards`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getIcsDownloadUrl(id: string): string {
  return `${API_BASE_URL}/interviews/${id}/calendar.ics`;
}

/**
 * Authenticated .ics Calendar Invite download.
 * Fetches the .ics with authorization headers and triggers browser download.
 */
export async function downloadIcsBlob(
  interviewId: string,
  filename = "interview-invitation.ics",
): Promise<void> {
  const url = `${API_BASE_URL}/interviews/${interviewId}/calendar.ics`;
  const token = getAccessToken();
  const orgId = getActiveOrganizationId();

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (orgId) headers["X-Organization-Id"] = orgId;

  const res = await fetch(url, { headers, credentials: "include" });

  if (!res.ok) {
    throw new Error(`Calendar invite download failed: ${res.status} ${res.statusText}`);
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
