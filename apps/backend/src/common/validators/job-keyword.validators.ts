import { z } from 'zod';

import { cuidSchema } from './shared.validators.js';

export const keywordTypeEnum = z.enum(['REQUIRED', 'OPTIONAL', 'BONUS']);

export const createJobKeywordSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(80),
  type: keywordTypeEnum,
  weight: z.number().min(0).max(100).default(1.0),
});

export type CreateJobKeywordInput = z.infer<typeof createJobKeywordSchema>;

export const bulkCreateJobKeywordsSchema = z.object({
  keywords: z.array(createJobKeywordSchema).min(1).max(50),
});

export type BulkCreateJobKeywordsInput = z.infer<typeof bulkCreateJobKeywordsSchema>;

export const jobKeywordParamsSchema = z.object({
  id: cuidSchema,
  jobPostId: cuidSchema,
});

export type JobKeywordParams = z.infer<typeof jobKeywordParamsSchema>;
