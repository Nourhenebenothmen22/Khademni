export type RealtimeEventType =
  | "CONNECTED"
  | "NOTIFICATION_CREATED"
  | "NOTIFICATION_READ"
  | "NOTIFICATIONS_READ_ALL"
  | "APPLICATION_CREATED"
  | "APPLICATION_STATUS_UPDATED"
  | "MATCHING_PROGRESS_UPDATED"
  | "MATCHING_RUN_COMPLETED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_UPDATED"
  | "SCORECARD_SUBMITTED"
  | "JOB_STATUS_UPDATED";

export interface RealtimeEventPayload<T = unknown> {
  type: RealtimeEventType;
  data: T;
  timestamp: string;
  userId?: string | null;
  organizationId?: string | null;
}

export type TabSyncMessage =
  | { type: "AUTH_LOGOUT" }
  | { type: "AUTH_LOGIN"; userId: string; role: string }
  | { type: "INVALIDATE_QUERY"; queryKey: string[] };
