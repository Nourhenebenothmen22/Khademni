import { z } from 'zod';

import { atLeastOneFieldRefine, cuidSchema } from './shared.validators.js';
import { jsonObjectSchema } from './json.validator.js';

export const ruleTypeEnum = z.enum([
  'EXPERIENCE',
  'DEGREE',
  'CERTIFICATION',
  'KEYWORD',
  'CUSTOM',
]);

export const createJobMatchingRuleSchema = z.object({
  ruleName: z.string().min(2, 'Rule name must be at least 2 characters').max(120),
  type: ruleTypeEnum,
  condition: jsonObjectSchema,
  weight: z.number().min(0).max(100).default(1.0),
  isActive: z.boolean().default(true),
});

export type CreateJobMatchingRuleInput = z.infer<typeof createJobMatchingRuleSchema>;

export const updateJobMatchingRuleSchema = z
  .object({
    ruleName: z.string().min(2).max(120).optional(),
    type: ruleTypeEnum.optional(),
    condition: jsonObjectSchema.optional(),
    weight: z.number().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine(atLeastOneFieldRefine);

export type UpdateJobMatchingRuleInput = z.infer<typeof updateJobMatchingRuleSchema>;

export const jobMatchingRuleParamsSchema = z.object({
  id: cuidSchema,
  jobPostId: cuidSchema,
});

export type JobMatchingRuleParams = z.infer<typeof jobMatchingRuleParamsSchema>;
