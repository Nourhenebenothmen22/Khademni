import { z } from "zod";

import {
  cuidSchema,
  paginationSchema,
  sortOrderSchema,
} from "./shared.validators.js";

export const applicationStatusEnum = z.enum([
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEWED",
  "REJECTED",
  "ACCEPTED",
  "WITHDRAWN",
]);

export const adminSettableStatusEnum = z.enum([
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEWED",
  "REJECTED",
  "ACCEPTED",
]);

export const createApplicationSchema = z.object({
  jobPostId: cuidSchema,
  motivationLetter: z.string().max(5_000).optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const updateApplicationStatusSchema = z
  .object({
    status: adminSettableStatusEnum,
    reason: z.string().max(1_000).optional(),
  })
  .strict();

export type UpdateApplicationStatusInput = z.infer<
  typeof updateApplicationStatusSchema
>;

export const withdrawApplicationSchema = z.object({});

export type WithdrawApplicationInput = z.infer<
  typeof withdrawApplicationSchema
>;

export const applicationQuerySchema = z.object({
  status: applicationStatusEnum.optional(),
  candidateId: cuidSchema.optional(),
  jobPostId: cuidSchema.optional(),
  search: z.string().max(100).optional(),
  ...paginationSchema.shape,
  sortBy: z
    .enum(["submittedAt", "status", "createdAt"])
    .default("createdAt")
    .optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type ApplicationQuery = z.infer<typeof applicationQuerySchema>;

export const myApplicationsQuerySchema = z.object({
  status: applicationStatusEnum.optional(),
  ...paginationSchema.shape,
  sortBy: z
    .enum(["submittedAt", "status", "createdAt"])
    .default("createdAt")
    .optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type MyApplicationsQuery = z.infer<typeof myApplicationsQuerySchema>;

export const applicationParamsSchema = z.object({
  id: cuidSchema,
});

export type ApplicationParams = z.infer<typeof applicationParamsSchema>;

export const downloadDocumentParamsSchema = z.object({
  id: cuidSchema,
  docId: cuidSchema,
});

export type DownloadDocumentParams = z.infer<typeof downloadDocumentParamsSchema>;
