import { z } from 'zod';

import { cuidSchema, dateSchema } from './shared.validators.js';

// ── Schemas ───────────────────────────────────────────────────────────────────

export const createEvaluationSchema = z.object({
  modelId: cuidSchema,
  datasetName: z.string().min(1).max(200),
  evaluationSampleSize: z.number().int().min(1),
  averageLatencyMs: z.number().positive().optional(),
  evaluationDetails: z.record(z.string(), z.unknown()).optional(),
  evaluatedAt: dateSchema.optional(),
});

export const evaluationParamsSchema = z.object({
  id: cuidSchema,
  modelId: cuidSchema,
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;
export type EvaluationParams = z.infer<typeof evaluationParamsSchema>;
