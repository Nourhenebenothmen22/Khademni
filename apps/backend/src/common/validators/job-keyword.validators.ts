import { z } from 'zod';

import { cuidSchema } from './shared.validators.js';

// ---------------------------------------------------------------------------
// Prisma enum: KeywordType
// ---------------------------------------------------------------------------
export const keywordTypeEnum = z.enum(['REQUIRED', 'OPTIONAL', 'BONUS']);

// ---------------------------------------------------------------------------
// Create single keyword
// ---------------------------------------------------------------------------
export const createJobKeywordSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(100),
  type: keywordTypeEnum,
  weight: z.number().min(0.1).max(5.0).default(1.0),
});

export type CreateJobKeywordInput = z.infer<typeof createJobKeywordSchema>;

// ---------------------------------------------------------------------------
// Bulk create keywords (1–50)
// ---------------------------------------------------------------------------
export const bulkCreateJobKeywordsSchema = z.object({
  keywords: z.array(createJobKeywordSchema).min(1).max(50),
});

export type BulkCreateJobKeywordsInput = z.infer<typeof bulkCreateJobKeywordsSchema>;

// ---------------------------------------------------------------------------
// Route params (keyword id + parent job post id)
// ---------------------------------------------------------------------------
export const jobKeywordParamsSchema = z.object({
  id: cuidSchema,
  jobPostId: cuidSchema,
});

export type JobKeywordParams = z.infer<typeof jobKeywordParamsSchema>;
