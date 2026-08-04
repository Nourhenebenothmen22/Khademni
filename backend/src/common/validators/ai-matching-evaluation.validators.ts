import { z } from "zod";

import { cuidSchema, dateSchema } from "./shared.validators.js";
import { jsonObjectSchema } from "./json.validator.js";

export const createEvaluationSchema = z.object({
  modelId: cuidSchema,
  datasetName: z.string().min(1).max(200),
  evaluationSampleSize: z.number().int().min(1),
  averageLatencyMs: z.number().min(0).optional(),
  evaluationDetails: jsonObjectSchema.optional(),
  evaluatedAt: dateSchema.optional(),
});

export const evaluationParamsSchema = z.object({
  id: cuidSchema,
  modelId: cuidSchema,
});

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;
export type EvaluationParams = z.infer<typeof evaluationParamsSchema>;
