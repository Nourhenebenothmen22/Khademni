import { z } from 'zod';

export const jsonValueSchema: z.ZodType<unknown> = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()),
]);

export const jsonObjectSchema: z.ZodType<Record<string, unknown>> = z.record(
  z.string(),
  z.unknown(),
);
