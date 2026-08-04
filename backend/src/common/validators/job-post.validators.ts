import { z } from "zod";

import {
  atLeastOneFieldRefine,
  cuidSchema,
  dateSchema,
  paginationSchema,
  sortOrderSchema,
} from "./shared.validators.js";

export const jobStatusEnum = z.enum([
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
  "ARCHIVED",
]);

export const createJobPostSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(180),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(10_000),
  requirements: z
    .string()
    .min(10, "Requirements must be at least 10 characters")
    .max(10_000),
  status: jobStatusEnum.default("DRAFT").optional(),
  deadline: dateSchema
    .refine((date) => date > new Date(), {
      message: "Deadline must be a future date",
    })
    .optional(),
});

export type CreateJobPostInput = z.infer<typeof createJobPostSchema>;

export const updateJobPostSchema = z
  .object({
    title: z.string().min(3).max(180).optional(),
    description: z.string().min(20).max(10_000).optional(),
    requirements: z.string().min(10).max(10_000).optional(),
    status: jobStatusEnum.optional(),
    deadline: dateSchema
      .refine((date) => date > new Date(), {
        message: "Deadline must be a future date",
      })
      .optional(),
  })
  .superRefine(atLeastOneFieldRefine);

export type UpdateJobPostInput = z.infer<typeof updateJobPostSchema>;

export const jobPostQuerySchema = z.object({
  status: jobStatusEnum.optional(),
  createdById: cuidSchema.optional(),
  search: z.string().max(100).optional(),
  ...paginationSchema.shape,
  sortBy: z
    .enum(["createdAt", "title", "deadline", "status"])
    .default("createdAt")
    .optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type JobPostQuery = z.infer<typeof jobPostQuerySchema>;

export const jobPostParamsSchema = z.object({
  id: cuidSchema,
});

export type JobPostParams = z.infer<typeof jobPostParamsSchema>;
