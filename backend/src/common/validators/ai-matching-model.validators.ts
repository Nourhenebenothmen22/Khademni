import { z } from "zod";

import {
  atLeastOneFieldRefine,
  cuidSchema,
  paginationSchema,
  sortOrderSchema,
} from "./shared.validators.js";
import { jsonObjectSchema } from "./json.validator.js";

export const createAIMatchingModelSchema = z.object({
  name: z.string().min(1).max(200),
  version: z
    .string()
    .min(1)
    .max(50)
    .regex(/^\d+\.\d+\.\d+$/),
  algorithm: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  hyperparameters: jsonObjectSchema,
  isActive: z.boolean().default(true),
});

export const updateAIMatchingModelSchema = createAIMatchingModelSchema
  .partial()
  .superRefine(atLeastOneFieldRefine);

export const aiMatchingModelParamsSchema = z.object({
  id: cuidSchema,
});

export const aiMatchingModelQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  ...paginationSchema.shape,
  sortBy: z
    .enum(["createdAt", "name", "version"])
    .default("createdAt")
    .optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type CreateAIMatchingModelInput = z.infer<
  typeof createAIMatchingModelSchema
>;
export type UpdateAIMatchingModelInput = z.infer<
  typeof updateAIMatchingModelSchema
>;
export type AIMatchingModelParams = z.infer<typeof aiMatchingModelParamsSchema>;
export type AIMatchingModelQuery = z.infer<typeof aiMatchingModelQuerySchema>;
