import { z } from 'zod';

import { cuidSchema, dateSchema } from './shared.validators.js';
import { jsonObjectSchema } from './json.validator.js';

export const createDocumentParseResultSchema = z.object({
  documentId: cuidSchema,
  extractedText: z.string().min(1).max(500_000),
  structuredData: jsonObjectSchema.optional(),
  parserName: z.string().min(1).max(100),
  parserVersion: z.string().min(1).max(50),
  parsedAt: dateSchema.optional(),
});

export const documentParseResultParamsSchema = z.object({
  id: cuidSchema,
});

export type CreateDocumentParseResultInput = z.infer<typeof createDocumentParseResultSchema>;
export type DocumentParseResultParams = z.infer<typeof documentParseResultParamsSchema>;
