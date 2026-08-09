import type { ApplicationStatus } from "../../generated/prisma/client.js";

export const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "WITHDRAWN"],
  UNDER_REVIEW: ["SHORTLISTED", "INTERVIEW_SCHEDULED", "REJECTED", "WITHDRAWN"],
  SHORTLISTED: ["INTERVIEW_SCHEDULED", "ACCEPTED", "REJECTED", "WITHDRAWN"],
  INTERVIEW_SCHEDULED: ["INTERVIEWED", "REJECTED", "WITHDRAWN"],
  INTERVIEWED: ["ACCEPTED", "REJECTED", "WITHDRAWN"],
  REJECTED: [],
  ACCEPTED: [],
  WITHDRAWN: [],
};

export function isValidTransition(
  currentStatus: ApplicationStatus,
  newStatus: ApplicationStatus,
): boolean {
  if (currentStatus === newStatus) return false;
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
}
