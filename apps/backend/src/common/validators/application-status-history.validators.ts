import { z } from 'zod';
import { applicationStatusEnum } from './application.validators.js';
import { cuidSchema, paginationSchema, sortOrderSchema } from './shared.validators.js';

export const VALID_TRANSITIONS = {
  SUBMITTED: ['UNDER_REVIEW', 'WITHDRAWN'],
  UNDER_REVIEW: ['SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  REJECTED: [],
  ACCEPTED: [],
  WITHDRAWN: [],
} as const;

export const createStatusHistorySchema = z
  .object({
    applicationId: cuidSchema,
    oldStatus: applicationStatusEnum.optional(),
    newStatus: applicationStatusEnum,
    reason: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.oldStatus) {
      if (data.oldStatus === data.newStatus) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['newStatus'],
          message: `Status cannot transition to the same value: ${data.oldStatus}`,
        });
        return;
      }
      const allowedTransitions = VALID_TRANSITIONS[data.oldStatus] as readonly string[];
      if (!allowedTransitions.includes(data.newStatus)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['newStatus'],
          message: `Invalid status transition from ${data.oldStatus} to ${data.newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`,
        });
      }
    }
  });

export const statusHistoryQuerySchema = z.object({
  applicationId: cuidSchema.optional(),
  ...paginationSchema.shape,
  sortBy: z.enum(['changedAt']).default('changedAt').optional(),
  sortOrder: sortOrderSchema.optional(),
});

export const statusHistoryParamsSchema = z.object({
  id: cuidSchema,
});

export type CreateStatusHistoryInput = z.infer<typeof createStatusHistorySchema>;
export type StatusHistoryQuery = z.infer<typeof statusHistoryQuerySchema>;
export type StatusHistoryParams = z.infer<typeof statusHistoryParamsSchema>;
