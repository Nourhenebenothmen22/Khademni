import { z } from "zod";
import {
  cuidSchema,
  paginationSchema,
  sortOrderSchema,
} from "./shared.validators.js";

export const interviewTypeEnum = z.enum([
  "SCREENING",
  "TECHNICAL",
  "PEDAGOGICAL_DEMO",
  "BEHAVIORAL",
  "FINAL_HR",
]);

export const interviewStatusEnum = z.enum([
  "SCHEDULED",
  "RESCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const meetingProviderEnum = z.enum([
  "ZOOM",
  "GOOGLE_MEET",
  "MS_TEAMS",
  "CUSTOM_LINK",
  "IN_PERSON",
]);

export const scorecardRecommendationEnum = z.enum([
  "STRONG_HIRE",
  "HIRE",
  "NEUTRAL",
  "NO_HIRE",
  "STRONG_NO_HIRE",
]);

export const scheduleInterviewSchema = z
  .object({
    applicationId: cuidSchema,
    title: z.string().min(3, "Title must be at least 3 characters").max(200),
    description: z.string().max(2000).optional(),
    type: interviewTypeEnum.default("TECHNICAL"),
    startTime: z.string().datetime({ message: "Invalid ISO start time format" }),
    endTime: z.string().datetime({ message: "Invalid ISO end time format" }),
    timezone: z.string().default("UTC"),
    meetingProvider: meetingProviderEnum.default("CUSTOM_LINK"),
    customMeetingUrl: z.string().url("Invalid URL format").optional().or(z.literal("")),
    locationDetails: z.string().max(500).optional(),
    interviewerIds: z.array(cuidSchema).min(1, "At least one interviewer must be assigned"),
  })
  .refine(
    (data) => new Date(data.endTime) > new Date(data.startTime),
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>;

export const rescheduleInterviewSchema = z
  .object({
    startTime: z.string().datetime({ message: "Invalid ISO start time format" }),
    endTime: z.string().datetime({ message: "Invalid ISO end time format" }),
    timezone: z.string().optional(),
    reason: z.string().max(500).optional(),
  })
  .refine(
    (data) => new Date(data.endTime) > new Date(data.startTime),
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

export type RescheduleInterviewInput = z.infer<typeof rescheduleInterviewSchema>;

export const cancelInterviewSchema = z.object({
  reason: z.string().min(3, "Cancellation reason is required").max(500),
});

export type CancelInterviewInput = z.infer<typeof cancelInterviewSchema>;

export const scorecardCriteriaScoreSchema = z.object({
  category: z.string().min(2).max(100),
  criterion: z.string().min(2).max(100),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export type ScorecardCriteriaScoreInput = z.infer<typeof scorecardCriteriaScoreSchema>;

export const submitScorecardSchema = z.object({
  recommendation: scorecardRecommendationEnum,
  overallNotes: z.string().min(5, "Overall notes are required").max(4000),
  criteriaScores: z.array(scorecardCriteriaScoreSchema).optional(),
});

export type SubmitScorecardInput = z.infer<typeof submitScorecardSchema>;

export const interviewQuerySchema = z.object({
  status: interviewStatusEnum.optional(),
  candidateId: cuidSchema.optional(),
  jobPostId: cuidSchema.optional(),
  interviewerId: cuidSchema.optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  ...paginationSchema.shape,
  sortBy: z
    .enum(["startTime", "createdAt", "status"])
    .default("startTime")
    .optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type InterviewQuery = z.infer<typeof interviewQuerySchema>;

export const interviewParamsSchema = z.object({
  id: cuidSchema,
});

export type InterviewParams = z.infer<typeof interviewParamsSchema>;
