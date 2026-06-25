import { z } from 'zod';

import { cuidSchema } from './shared.validators.js';

// ---------------------------------------------------------------------------
// Prisma enum: RuleType
// ---------------------------------------------------------------------------
export const ruleTypeEnum = z.enum([
  'EXPERIENCE',
  'DEGREE',
  'CERTIFICATION',
  'KEYWORD',
  'CUSTOM',
]);

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export const createJobMatchingRuleSchema = z.object({
  ruleName: z.string().min(1, 'Rule name is required').max(200),
  type: ruleTypeEnum,
  condition: z.record(z.string(), z.unknown()),
  weight: z.number().min(0.1).max(10.0).default(1.0),
  isActive: z.boolean().default(true),
});

export type CreateJobMatchingRuleInput = z.infer<typeof createJobMatchingRuleSchema>;

// ---------------------------------------------------------------------------
// Update (partial — at least one field required)
// ---------------------------------------------------------------------------
export const updateJobMatchingRuleSchema = z
  .object({
    ruleName: z.string().min(1).max(200).optional(),
    type: ruleTypeEnum.optional(),
    condition: z.record(z.string(), z.unknown()).optional(),
    weight: z.number().min(0.1).max(10.0).optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const hasAtLeastOne = Object.values(data).some((v) => v !== undefined);
    if (!hasAtLeastOne) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field must be provided for update',
      });
    }
  });

export type UpdateJobMatchingRuleInput = z.infer<typeof updateJobMatchingRuleSchema>;

// ---------------------------------------------------------------------------
// Route params (rule id + parent job post id)
// ---------------------------------------------------------------------------
export const jobMatchingRuleParamsSchema = z.object({
  id: cuidSchema,
  jobPostId: cuidSchema,
});

export type JobMatchingRuleParams = z.infer<typeof jobMatchingRuleParamsSchema>;
