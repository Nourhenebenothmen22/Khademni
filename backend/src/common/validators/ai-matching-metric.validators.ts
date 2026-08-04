import { z } from "zod";

import { cuidSchema } from "./shared.validators.js";

export const evaluationMetricTypeEnum = z.enum([
  "ACCURACY",
  "PRECISION",
  "RECALL",
  "F1_SCORE",
  "PRECISION_AT_1",
  "PRECISION_AT_5",
  "NDCG_AT_5",
  "MAP",
  "MRR",
]);

export const createMetricSchema = z.object({
  evaluationId: cuidSchema,
  type: evaluationMetricTypeEnum,
  value: z.number().min(0).max(1),
});

export const bulkCreateMetricsSchema = z.object({
  metrics: z
    .array(createMetricSchema.omit({ evaluationId: true }))
    .min(1)
    .max(20),
});

export const metricParamsSchema = z.object({
  id: cuidSchema,
  evaluationId: cuidSchema,
});

export type CreateMetricInput = z.infer<typeof createMetricSchema>;
export type BulkCreateMetricsInput = z.infer<typeof bulkCreateMetricsSchema>;
export type MetricParams = z.infer<typeof metricParamsSchema>;
