import { z } from 'zod';

import { cuidSchema, paginationSchema, sortOrderSchema } from './shared.validators.js';

// ── Prisma Enums ──────────────────────────────────────────────────────────────

const RunStatus = z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']);

// ── Schemas ───────────────────────────────────────────────────────────────────

export const createMatchingRunSchema = z.object({
  applicationId: cuidSchema,
  modelId: cuidSchema,
});

export const updateMatchingRunSchema = z
  .object({
    status: RunStatus.optional(),
    totalScore: z.number().min(0).max(100).optional(),
    confidence: z.number().min(0).max(1).optional(),
    matchedKeywords: z.record(z.string(), z.unknown()).optional(),
    missingKeywords: z.record(z.string(), z.unknown()).optional(),
    ruleResults: z.record(z.string(), z.unknown()).optional(),
    scoreBreakdown: z.record(z.string(), z.unknown()).optional(),
    semanticResult: z.record(z.string(), z.unknown()).optional(),
    technicalMetrics: z.record(z.string(), z.unknown()).optional(),
    explanation: z.string().max(5000).optional(),
    errorMessage: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const hasAtLeastOneField = Object.values(data).some(
      (value) => value !== undefined,
    );
    if (!hasAtLeastOneField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field must be provided',
      });
    }
  });

export const matchingRunParamsSchema = z.object({
  id: cuidSchema,
});

export const matchingRunQuerySchema = z.object({
  applicationId: cuidSchema.optional(),
  modelId: cuidSchema.optional(),
  status: RunStatus.optional(),
  ...paginationSchema.shape,
  sortBy: z.enum(['startedAt', 'status', 'totalScore']).default('startedAt').optional(),
  sortOrder: sortOrderSchema.optional(),
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type CreateMatchingRunInput = z.infer<typeof createMatchingRunSchema>;
export type UpdateMatchingRunInput = z.infer<typeof updateMatchingRunSchema>;
export type MatchingRunParams = z.infer<typeof matchingRunParamsSchema>;
export type MatchingRunQuery = z.infer<typeof matchingRunQuerySchema>;
