import { z } from 'zod';

import { cuidSchema } from './shared.validators.js';

// ── Schemas ───────────────────────────────────────────────────────────────────

export const createCVParseResultSchema = z.object({
  documentId: cuidSchema,
  extractedText: z.string().max(500_000),
  parserName: z.string().min(1).max(100),
  parserVersion: z.string().min(1).max(50),
});

export const cvParseResultParamsSchema = z.object({
  id: cuidSchema,
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type CreateCVParseResultInput = z.infer<typeof createCVParseResultSchema>;
export type CVParseResultParams = z.infer<typeof cvParseResultParamsSchema>;
