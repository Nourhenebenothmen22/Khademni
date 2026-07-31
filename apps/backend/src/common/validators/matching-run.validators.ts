import { z } from "zod";

import {
  atLeastOneFieldRefine,
  cuidSchema,
  paginationSchema,
  sortOrderSchema,
} from "./shared.validators.js";
import { jsonObjectSchema } from "./json.validator.js";

const RunStatus = z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]);

export const createMatchingRunSchema = z.object({
  applicationId: cuidSchema,
  modelId: cuidSchema,
});

export const updateMatchingRunSchema = z
  .object({
    status: RunStatus.optional(),
    totalScore: z.number().min(0).max(100).optional(),
    confidence: z.number().min(0).max(1).optional(),
    matchedKeywords: jsonObjectSchema.optional(),
    missingKeywords: jsonObjectSchema.optional(),
    ruleResults: jsonObjectSchema.optional(),
    scoreBreakdown: jsonObjectSchema.optional(),
    semanticResult: jsonObjectSchema.optional(),
    technicalMetrics: jsonObjectSchema.optional(),
    explanation: z.string().max(5000).optional(),
    errorMessage: z.string().max(2000).optional(),
  })
  .superRefine(atLeastOneFieldRefine);

export const matchingRunParamsSchema = z.object({
  id: cuidSchema,
});

export const matchingRunQuerySchema = z.object({
  applicationId: cuidSchema.optional(),
  modelId: cuidSchema.optional(),
  status: RunStatus.optional(),
  ...paginationSchema.shape,
  sortBy: z
    .enum(["startedAt", "status", "totalScore"])
    .default("startedAt")
    .optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type CreateMatchingRunInput = z.infer<typeof createMatchingRunSchema>;
export type UpdateMatchingRunInput = z.infer<typeof updateMatchingRunSchema>;
export type MatchingRunParams = z.infer<typeof matchingRunParamsSchema>;
export type MatchingRunQuery = z.infer<typeof matchingRunQuerySchema>;
