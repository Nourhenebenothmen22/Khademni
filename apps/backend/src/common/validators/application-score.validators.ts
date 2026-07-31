import { z } from "zod";
import {
  cuidSchema,
  paginationSchema,
  sortOrderSchema,
} from "./shared.validators.js";

export const scoreRecommendationEnum = z.enum([
  "HIGHLY_RECOMMENDED",
  "RECOMMENDED",
  "AVERAGE",
  "NOT_RECOMMENDED",
]);

export const createApplicationScoreSchema = z.object({
  applicationId: cuidSchema,
  matchingRunId: cuidSchema,
  finalScore: z.number().min(0).max(100),
  recommendation: scoreRecommendationEnum,
  explanation: z.string().max(5000).optional(),
});

export const applicationScoreParamsSchema = z.object({
  id: cuidSchema,
});

export const applicationScoreQuerySchema = z.object({
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
  recommendation: scoreRecommendationEnum.optional(),
  ...paginationSchema.shape,
  sortBy: z
    .enum(["calculatedAt", "finalScore"])
    .default("calculatedAt")
    .optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type CreateApplicationScoreInput = z.infer<
  typeof createApplicationScoreSchema
>;
export type ApplicationScoreParams = z.infer<
  typeof applicationScoreParamsSchema
>;
export type ApplicationScoreQuery = z.infer<typeof applicationScoreQuerySchema>;
