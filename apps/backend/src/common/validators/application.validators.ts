import { z } from 'zod';

import {
  cuidSchema,
  paginationSchema,
  sortOrderSchema,
} from './shared.validators.js';

// ---------------------------------------------------------------------------
// Prisma enum: ApplicationStatus (full set — used for queries)
// ---------------------------------------------------------------------------
export const applicationStatusEnum = z.enum([
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'REJECTED',
  'ACCEPTED',
  'WITHDRAWN',
]);

// ---------------------------------------------------------------------------
// Admin-settable statuses only
// ---------------------------------------------------------------------------
export const adminSettableStatusEnum = z.enum([
  'UNDER_REVIEW',
  'SHORTLISTED',
  'REJECTED',
  'ACCEPTED',
]);

// ---------------------------------------------------------------------------
// Create (candidate submits)
// ---------------------------------------------------------------------------
export const createApplicationSchema = z.object({
  jobPostId: cuidSchema,
  motivationLetter: z.string().max(5_000).optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

// ---------------------------------------------------------------------------
// Update status (admin action — strict, no extra fields)
// ---------------------------------------------------------------------------
export const updateApplicationStatusSchema = z
  .object({
    status: adminSettableStatusEnum,
    reason: z.string().max(1_000).optional(),
  })
  .strict();

export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;

// ---------------------------------------------------------------------------
// Withdraw (empty body — action derived from endpoint)
// ---------------------------------------------------------------------------
export const withdrawApplicationSchema = z.object({});

export type WithdrawApplicationInput = z.infer<typeof withdrawApplicationSchema>;

// ---------------------------------------------------------------------------
// Query / list
// ---------------------------------------------------------------------------
export const applicationQuerySchema = z.object({
  status: applicationStatusEnum.optional(),
  candidateId: cuidSchema.optional(),
  jobPostId: cuidSchema.optional(),
  search: z.string().max(100).optional(),
  ...paginationSchema.shape,
  sortBy: z
    .enum(['submittedAt', 'status', 'createdAt'])
    .default('createdAt')
    .optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type ApplicationQuery = z.infer<typeof applicationQuerySchema>;

// ---------------------------------------------------------------------------
// Route params
// ---------------------------------------------------------------------------
export const applicationParamsSchema = z.object({
  id: cuidSchema,
});

export type ApplicationParams = z.infer<typeof applicationParamsSchema>;
