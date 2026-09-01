import type { WebSocket } from "ws";

export type RealtimeEventType =
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

export interface AuthenticatedWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
  role?: string;
  organizationId?: string | null;
  rooms: Set<string>;
}
