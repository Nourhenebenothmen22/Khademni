import { z } from 'zod';

import { cuidSchema } from './shared.validators.js';

// ── Prisma Enums ──────────────────────────────────────────────────────────────

const EvaluationMetricType = z.enum([
  'ACCURACY',
  'PRECISION',
  'RECALL',
  'F1_SCORE',
  'PRECISION_AT_1',
  'PRECISION_AT_5',
  'NDCG_AT_5',
  'MAP',
  'MRR',
]);

// ── Schemas ───────────────────────────────────────────────────────────────────

export const createMetricSchema = z.object({
  evaluationId: cuidSchema,
  type: EvaluationMetricType,
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

// ── Inferred Types ────────────────────────────────────────────────────────────

export type CreateMetricInput = z.infer<typeof createMetricSchema>;
export type BulkCreateMetricsInput = z.infer<typeof bulkCreateMetricsSchema>;
export type MetricParams = z.infer<typeof metricParamsSchema>;
