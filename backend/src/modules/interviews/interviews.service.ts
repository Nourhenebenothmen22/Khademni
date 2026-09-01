import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import { logAuditAction } from "../../lib/audit.js";
import { createNotification } from "../notifications/notifications.service.js";
import { realtimeEventBus } from "../../lib/realtime/event-bus.js";
import {
  sendInterviewInvitationEmail,
  sendInterviewRescheduledEmail,
  sendInterviewCancelledEmail,
} from "../../lib/email.js";
import {
  generateIcsFile,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from "./calendar.service.js";
import { createMeetingLink } from "./providers/meeting-provider.factory.js";
import { isValidTransition } from "../applications/status-machine.js";
import { PAGINATION_CONFIG } from "../../config/constants.js";
import type {
  ScheduleInterviewInput,
  RescheduleInterviewInput,
  CancelInterviewInput,
  SubmitScorecardInput,
  InterviewQuery,
} from "../../common/validators/interview.validators.js";
import type { InterviewStatus } from "../../generated/prisma/client.js";

export async function scheduleInterview(
  createdById: string,
  input: ScheduleInterviewInput,
  organizationId: string,
) {
  const application = await prisma.application.findFirst({
    where: {
      id: input.applicationId,
      jobPost: { organizationId },
    },
    include: {
      candidate: { select: { id: true, fullName: true, email: true } },
      jobPost: { select: { id: true, title: true, organizationId: true } },
    },
  });

  if (!application) {
    throw new AppError("Application not found or cross-tenant access denied.", 404);
  }

  // Validate interviewers exist in organization
  const interviewers = await prisma.user.findMany({
    where: {
      id: { in: input.interviewerIds },
      organizationId,
    },
    select: { id: true, fullName: true, email: true },
  });

  if (interviewers.length !== input.interviewerIds.length) {
    throw new AppError("One or more assigned interviewers do not exist in your organization.", 400);
  }

  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  const durationMinutes = Math.max(15, Math.round((endTime.getTime() - startTime.getTime()) / 60000));

  const meetingResult = await createMeetingLink({
    topic: `${input.type} Interview — ${application.jobPost.title}`,
    startTime,
    durationMinutes,
    provider: input.meetingProvider,
    customMeetingUrl: input.customMeetingUrl,
    locationDetails: input.locationDetails,
  });

  const interview = await prisma.$transaction(async (tx) => {
    const newInterview = await tx.interview.create({
      data: {
        organizationId,
        applicationId: input.applicationId,
        jobPostId: application.jobPostId,
        candidateId: application.candidateId,
        createdById,
        title: input.title,
        description: input.description,
        type: input.type,
        status: "SCHEDULED",
        startTime,
        endTime,
        timezone: input.timezone,
        meetingProvider: meetingResult.providerUsed,
        meetingUrl: meetingResult.meetingUrl,
        meetingId: meetingResult.meetingId,
        meetingPasscode: meetingResult.meetingPasscode,
        locationDetails: input.locationDetails,
      },
    });

    await tx.interviewerAssignment.createMany({
      data: input.interviewerIds.map((userId, index) => ({
        interviewId: newInterview.id,
        userId,
        isPrimary: index === 0,
      })),
    });

    // Update application status if valid
    if (isValidTransition(application.status, "INTERVIEW_SCHEDULED")) {
      await tx.application.update({
        where: { id: input.applicationId },
        data: { status: "INTERVIEW_SCHEDULED" },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: input.applicationId,
          oldStatus: application.status,
          newStatus: "INTERVIEW_SCHEDULED",
          changedById: createdById,
          reason: `Interview scheduled (${input.type})`,
        },
      });
    }

    return tx.interview.findUnique({
      where: { id: newInterview.id },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        jobPost: { select: { id: true, title: true, organization: { select: { name: true } } } },
        interviewers: { include: { user: { select: { id: true, fullName: true, email: true } } } },
      },
    });
  }, { maxWait: 20000, timeout: 45000 });

  if (!interview) {
    throw new AppError("Failed to schedule interview.", 500);
  }

  // Generate iCal ICS and Calendar web URLs
  const calendarEvent = {
    uid: `interview-${interview.id}@khademni.com`,
    title: `${input.type} Interview — ${application.jobPost.title}`,
    description: input.description || `Interview for position ${application.jobPost.title}`,
    location: meetingResult.meetingUrl || input.locationDetails || "Online",
    startTime,
    endTime,
    organizerName: interview.jobPost.organization?.name || "Recruitment Team",
    organizerEmail: "noreply@khademni.com",
    attendees: [
      { name: application.candidate.fullName, email: application.candidate.email },
      ...interviewers.map((i) => ({ name: i.fullName, email: i.email })),
    ],
  };

  const icsContent = generateIcsFile(calendarEvent);
  const googleCalUrl = generateGoogleCalendarUrl(calendarEvent);
  const outlookCalUrl = generateOutlookCalendarUrl(calendarEvent);

  const startTimeFormatted = startTime.toLocaleString("en-US", { timeZone: input.timezone, dateStyle: "full", timeStyle: "short" });
  const endTimeFormatted = endTime.toLocaleString("en-US", { timeZone: input.timezone, timeStyle: "short" });

  // Send Brevo Email to Candidate
  sendInterviewInvitationEmail({
    to: application.candidate.email,
    fullName: application.candidate.fullName,
    jobTitle: application.jobPost.title,
    interviewType: input.type,
    startTimeFormatted,
    endTimeFormatted,
    timezone: input.timezone,
    meetingUrl: meetingResult.meetingUrl,
    locationDetails: input.locationDetails,
    organizationName: interview.jobPost.organization?.name,
    icsContent,
    googleCalendarUrl: googleCalUrl,
    outlookCalendarUrl: outlookCalUrl,
  });

  // Send Brevo Email to Panel Interviewers
  interviewers.forEach((interviewer) => {
    sendInterviewInvitationEmail({
      to: interviewer.email,
      fullName: interviewer.fullName,
      jobTitle: application.jobPost.title,
      interviewType: input.type,
      startTimeFormatted,
      endTimeFormatted,
      timezone: input.timezone,
      meetingUrl: meetingResult.meetingUrl,
      locationDetails: input.locationDetails,
      organizationName: interview.jobPost.organization?.name,
      icsContent,
      googleCalendarUrl: googleCalUrl,
      outlookCalendarUrl: outlookCalUrl,
    });

    createNotification({
      userId: interviewer.id,
      title: `Panel Interview Assigned: ${application.candidate.fullName}`,
      message: `You are assigned to conduct a ${input.type} interview for "${application.jobPost.title}" on ${startTimeFormatted}.`,
      type: "INTERVIEW_ASSIGNED",
      metadata: { interviewId: interview.id, applicationId: input.applicationId },
    });
  });

  createNotification({
    userId: application.candidate.id,
    title: `Interview Scheduled: ${input.type}`,
    message: `Your interview for "${application.jobPost.title}" has been scheduled for ${startTimeFormatted}.`,
    type: "INTERVIEW_SCHEDULED",
    metadata: { interviewId: interview.id, applicationId: input.applicationId, meetingUrl: meetingResult.meetingUrl },
  });

  logAuditAction({
    userId: createdById,
    organizationId,
    action: "INTERVIEW_SCHEDULED",
    entityType: "Interview",
    entityId: interview.id,
    metadata: { applicationId: input.applicationId, type: input.type, startTime, endTime },
  });

  realtimeEventBus.emitEvent({
    type: "INTERVIEW_SCHEDULED",
    data: {
      interviewId: interview.id,
      applicationId: input.applicationId,
      type: input.type,
      startTime,
      endTime,
      meetingUrl: meetingResult.meetingUrl,
      candidateId: application.candidate.id,
      jobTitle: application.jobPost.title,
    },
    userId: application.candidate.id,
    organizationId,
  });

  return interview;
}

export async function rescheduleInterview(
  interviewId: string,
  changedById: string,
  input: RescheduleInterviewInput,
  organizationId: string,
) {
  const interview = await prisma.interview.findFirst({
    where: { id: interviewId, organizationId },
    include: {
      candidate: { select: { id: true, fullName: true, email: true } },
      jobPost: { select: { id: true, title: true, organization: { select: { name: true } } } },
      interviewers: { include: { user: { select: { id: true, fullName: true, email: true } } } },
    },
  });

  if (!interview) {
    throw new AppError("Interview not found or access denied.", 404);
  }

  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  const tz = input.timezone || interview.timezone;

  const updatedInterview = await prisma.interview.update({
    where: { id: interviewId },
    data: {
      startTime,
      endTime,
      timezone: tz,
      rescheduleReason: input.reason,
      status: "RESCHEDULED",
    },
    include: {
      candidate: { select: { id: true, fullName: true, email: true } },
      jobPost: { select: { id: true, title: true, organization: { select: { name: true } } } },
      interviewers: { include: { user: { select: { id: true, fullName: true, email: true } } } },
    },
  });

  const calendarEvent = {
    uid: `interview-${interview.id}@khademni.com`,
    title: `${interview.type} Interview (Rescheduled) — ${interview.jobPost.title}`,
    description: input.reason ? `Rescheduled. Reason: ${input.reason}` : `Interview for position ${interview.jobPost.title}`,
    location: interview.meetingUrl || interview.locationDetails || "Online",
    startTime,
    endTime,
    organizerName: interview.jobPost.organization?.name || "Recruitment Team",
    organizerEmail: "noreply@khademni.com",
    attendees: [
      { name: interview.candidate.fullName, email: interview.candidate.email },
      ...interview.interviewers.map((i) => ({ name: i.user.fullName, email: i.user.email })),
    ],
    sequence: 1,
  };

  const icsContent = generateIcsFile(calendarEvent);
  const startTimeFormatted = startTime.toLocaleString("en-US", { timeZone: tz, dateStyle: "full", timeStyle: "short" });
  const endTimeFormatted = endTime.toLocaleString("en-US", { timeZone: tz, timeStyle: "short" });

  sendInterviewRescheduledEmail({
    to: interview.candidate.email,
    fullName: interview.candidate.fullName,
    jobTitle: interview.jobPost.title,
    newStartTimeFormatted: startTimeFormatted,
    newEndTimeFormatted: endTimeFormatted,
    timezone: tz,
    reason: input.reason,
    meetingUrl: interview.meetingUrl || undefined,
    organizationName: interview.jobPost.organization?.name,
    icsContent,
  });

  interview.interviewers.forEach((inv) => {
    sendInterviewRescheduledEmail({
      to: inv.user.email,
      fullName: inv.user.fullName,
      jobTitle: interview.jobPost.title,
      newStartTimeFormatted: startTimeFormatted,
      newEndTimeFormatted: endTimeFormatted,
      timezone: tz,
      reason: input.reason,
      meetingUrl: interview.meetingUrl || undefined,
      organizationName: interview.jobPost.organization?.name,
      icsContent,
    });
  });

  logAuditAction({
    userId: changedById,
    organizationId,
    action: "INTERVIEW_RESCHEDULED",
    entityType: "Interview",
    entityId: interviewId,
    metadata: { oldStartTime: interview.startTime, newStartTime: startTime, reason: input.reason },
  });

  return updatedInterview;
}

export async function cancelInterview(
  interviewId: string,
  cancelledById: string,
  input: CancelInterviewInput,
  organizationId: string,
) {
  const interview = await prisma.interview.findFirst({
    where: { id: interviewId, organizationId },
    include: {
      candidate: { select: { id: true, fullName: true, email: true } },
      jobPost: { select: { id: true, title: true, organization: { select: { name: true } } } },
      interviewers: { include: { user: { select: { id: true, fullName: true, email: true } } } },
    },
  });

  if (!interview) {
    throw new AppError("Interview not found or access denied.", 404);
  }

  const updatedInterview = await prisma.interview.update({
    where: { id: interviewId },
    data: {
      status: "CANCELLED",
      cancelReason: input.reason,
    },
  });

  const calendarEvent = {
    uid: `interview-${interview.id}@khademni.com`,
    title: `CANCELLED: ${interview.type} Interview — ${interview.jobPost.title}`,
    description: `Interview cancelled. Reason: ${input.reason}`,
    location: "Cancelled",
    startTime: interview.startTime,
    endTime: interview.endTime,
    organizerName: interview.jobPost.organization?.name || "Recruitment Team",
    organizerEmail: "noreply@khademni.com",
    attendees: [
      { name: interview.candidate.fullName, email: interview.candidate.email },
      ...interview.interviewers.map((i) => ({ name: i.user.fullName, email: i.user.email })),
    ],
    method: "CANCEL" as const,
    sequence: 2,
  };

  const icsContent = generateIcsFile(calendarEvent);

  sendInterviewCancelledEmail({
    to: interview.candidate.email,
    fullName: interview.candidate.fullName,
    jobTitle: interview.jobPost.title,
    reason: input.reason,
    organizationName: interview.jobPost.organization?.name,
    icsContent,
  });

  interview.interviewers.forEach((inv) => {
    sendInterviewCancelledEmail({
      to: inv.user.email,
      fullName: inv.user.fullName,
      jobTitle: interview.jobPost.title,
      reason: input.reason,
      organizationName: interview.jobPost.organization?.name,
      icsContent,
    });
  });

  logAuditAction({
    userId: cancelledById,
    organizationId,
    action: "INTERVIEW_CANCELLED",
    entityType: "Interview",
    entityId: interviewId,
    metadata: { reason: input.reason },
  });

  return updatedInterview;
}

export async function submitScorecard(
  interviewId: string,
  interviewerId: string,
  input: SubmitScorecardInput,
  organizationId: string,
) {
  const interview = await prisma.interview.findFirst({
    where: { id: interviewId, organizationId },
    include: {
      interviewers: true,
      scorecards: true,
    },
  });

  if (!interview) {
    throw new AppError("Interview not found or access denied.", 404);
  }

  const isAssigned = interview.interviewers.some((inv) => inv.userId === interviewerId);
  if (!isAssigned) {
    throw new AppError("Forbidden. Only assigned interviewers can submit a scorecard.", 403);
  }

  const scorecard = await prisma.$transaction(async (tx) => {
    const sc = await tx.interviewScorecard.upsert({
      where: {
        interviewId_interviewerId: {
          interviewId,
          interviewerId,
        },
      },
      create: {
        interviewId,
        interviewerId,
        recommendation: input.recommendation,
        overallNotes: input.overallNotes,
      },
      update: {
        recommendation: input.recommendation,
        overallNotes: input.overallNotes,
        submittedAt: new Date(),
      },
    });

    if (input.criteriaScores && input.criteriaScores.length > 0) {
      await tx.scorecardCriteriaScore.deleteMany({
        where: { scorecardId: sc.id },
      });

      await tx.scorecardCriteriaScore.createMany({
        data: input.criteriaScores.map((c) => ({
          scorecardId: sc.id,
          category: c.category,
          criterion: c.criterion,
          score: c.score,
          comment: c.comment,
        })),
      });
    }

    const updatedScorecards = await tx.interviewScorecard.findMany({
      where: { interviewId },
    });

    // If all assigned interviewers submitted scorecards, set interview status COMPLETED and application status INTERVIEWED
    if (updatedScorecards.length >= interview.interviewers.length) {
      await tx.interview.update({
        where: { id: interviewId },
        data: { status: "COMPLETED" },
      });

      await tx.application.update({
        where: { id: interview.applicationId },
        data: { status: "INTERVIEWED" },
      });
    }

    return tx.interviewScorecard.findUnique({
      where: { id: sc.id },
      include: { criteriaScores: true, interviewer: { select: { id: true, fullName: true } } },
    });
  }, { maxWait: 20000, timeout: 45000 });

  logAuditAction({
    userId: interviewerId,
    organizationId,
    action: "SCORECARD_SUBMITTED",
    entityType: "InterviewScorecard",
    entityId: scorecard!.id,
    metadata: { interviewId, recommendation: input.recommendation },
  });

  realtimeEventBus.emitEvent({
    type: "SCORECARD_SUBMITTED",
    data: {
      interviewId,
      scorecardId: scorecard!.id,
      recommendation: input.recommendation,
      interviewerId,
    },
    organizationId,
  });

  return scorecard!;
}

export async function getInterviewById(
  interviewId: string,
  userId: string,
  role: string,
  organizationId?: string,
) {
  const interview = await prisma.interview.findFirst({
    where: {
      id: interviewId,
      ...(role === "ORGANIZATION_ADMIN" ? { organizationId } : {}),
      ...(role === "CANDIDATE" ? { candidateId: userId } : {}),
    },
    include: {
      candidate: { select: { id: true, fullName: true, email: true, avatarKey: true } },
      jobPost: { select: { id: true, title: true, status: true } },
      interviewers: { include: { user: { select: { id: true, fullName: true, email: true, avatarKey: true } } } },
      scorecards: { include: { criteriaScores: true, interviewer: { select: { id: true, fullName: true } } } },
    },
  });

  if (!interview) {
    throw new AppError("Interview not found or access denied.", 404);
  }

  return interview;
}

export async function getInterviews(
  query: InterviewQuery,
  organizationId?: string,
) {
  const page = query.page ?? PAGINATION_CONFIG.DEFAULT_PAGE;
  const limit = query.limit ?? PAGINATION_CONFIG.DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  const whereClause: Prisma.InterviewWhereInput = {};

  if (organizationId) {
    whereClause.organizationId = organizationId;
  }

  if (query.status) whereClause.status = query.status as InterviewStatus;
  if (query.candidateId) whereClause.candidateId = query.candidateId;
  if (query.jobPostId) whereClause.jobPostId = query.jobPostId;
  if (query.interviewerId) {
    whereClause.interviewers = { some: { userId: query.interviewerId } };
  }

  if (query.fromDate || query.toDate) {
    whereClause.startTime = {
      ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
      ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
    };
  }

  const [total, items] = await Promise.all([
    prisma.interview.count({ where: whereClause }),
    prisma.interview.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [query.sortBy || "startTime"]: query.sortOrder || "asc" },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        jobPost: { select: { id: true, title: true } },
        interviewers: { include: { user: { select: { id: true, fullName: true, email: true } } } },
        scorecards: { select: { id: true, recommendation: true, interviewerId: true } },
      },
    }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getCandidateInterviews(
  candidateId: string,
  query: Partial<InterviewQuery> = {},
) {
  const page = Math.max(
    PAGINATION_CONFIG.DEFAULT_PAGE,
    Number(query.page) || PAGINATION_CONFIG.DEFAULT_PAGE,
  );
  const limit = Math.min(
    PAGINATION_CONFIG.MAX_LIMIT,
    Math.max(1, Number(query.limit) || PAGINATION_CONFIG.DEFAULT_LIMIT),
  );
  const skip = (page - 1) * limit;

  const where: Prisma.InterviewWhereInput = {
    candidateId,
    ...(query.status ? { status: query.status as InterviewStatus } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.interview.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startTime: query.sortOrder || "asc" },
      include: {
        jobPost: { select: { id: true, title: true, organization: { select: { name: true } } } },
        interviewers: { include: { user: { select: { fullName: true } } } },
      },
    }),
    prisma.interview.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getIcsFileContent(
  interviewId: string,
  userId: string,
  role: string,
  organizationId?: string,
) {
  const interview = await getInterviewById(interviewId, userId, role, organizationId);

  const event = {
    uid: `interview-${interview.id}@khademni.com`,
    title: `${interview.type} Interview — ${interview.jobPost.title}`,
    description: interview.description || `Interview for ${interview.jobPost.title}`,
    location: interview.meetingUrl || interview.locationDetails || "Online",
    startTime: interview.startTime,
    endTime: interview.endTime,
    organizerName: "Recruitment Team",
    organizerEmail: "noreply@khademni.com",
    attendees: [
      { name: interview.candidate.fullName, email: interview.candidate.email },
      ...interview.interviewers.map((i) => ({ name: i.user.fullName, email: i.user.email })),
    ],
  };

  return generateIcsFile(event);
}
