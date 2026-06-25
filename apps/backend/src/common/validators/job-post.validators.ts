import { z } from 'zod';

import {
  cuidSchema,
  dateSchema,
  paginationSchema,
  sortOrderSchema,
} from './shared.validators.js';

// ---------------------------------------------------------------------------
// Prisma enum: JobStatus
// ---------------------------------------------------------------------------
export const jobStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']);

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export const createJobPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(10_000),
  requirements: z.string().min(1, 'Requirements are required').max(10_000),
  status: jobStatusEnum.default('DRAFT').optional(),
  deadline: dateSchema
    .refine((date) => date > new Date(), {
      message: 'Deadline must be a future date',
    })
    .optional(),
});

export type CreateJobPostInput = z.infer<typeof createJobPostSchema>;

// ---------------------------------------------------------------------------
// Update (partial — at least one field required)
// ---------------------------------------------------------------------------
export const updateJobPostSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(10_000).optional(),
    requirements: z.string().min(1).max(10_000).optional(),
    status: jobStatusEnum.optional(),
    deadline: dateSchema
      .refine((date) => date > new Date(), {
        message: 'Deadline must be a future date',
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasAtLeastOne = Object.values(data).some((v) => v !== undefined);
    if (!hasAtLeastOne) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field must be provided for update',
      });
    }
  });

export type UpdateJobPostInput = z.infer<typeof updateJobPostSchema>;

// ---------------------------------------------------------------------------
// Query / list
// ---------------------------------------------------------------------------
export const jobPostQuerySchema = z.object({
  status: jobStatusEnum.optional(),
  createdById: cuidSchema.optional(),
  search: z.string().max(100).optional(),
  ...paginationSchema.shape,
  sortBy: z
    .enum(['createdAt', 'title', 'deadline', 'status'])
    .default('createdAt')
    .optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type JobPostQuery = z.infer<typeof jobPostQuerySchema>;

// ---------------------------------------------------------------------------
// Route params
// ---------------------------------------------------------------------------
export const jobPostParamsSchema = z.object({
  id: cuidSchema,
});

export type JobPostParams = z.infer<typeof jobPostParamsSchema>;
