import { z } from 'zod';

import { cuidSchema, paginationSchema } from './shared.validators.js';

// ── Prisma Enums ──────────────────────────────────────────────────────────────

const DocumentType = z.enum(['CV', 'MOTIVATION_LETTER']);
const DocumentStatus = z.enum(['UPLOADED', 'SCANNED', 'VALIDATED', 'REJECTED']);

// ── Schemas ───────────────────────────────────────────────────────────────────

export const uploadDocumentSchema = z.object({
  type: DocumentType,
  originalName: z.string().min(1).max(255),
  mimeType: z.enum([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]),
  extension: z.enum(['.pdf', '.docx']),
  sizeBytes: z.number().int().min(1).max(5_242_880),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export const documentParamsSchema = z.object({
  id: cuidSchema,
  applicationId: cuidSchema,
});

export const documentQuerySchema = z.object({
  applicationId: cuidSchema.optional(),
  type: DocumentType.optional(),
  status: DocumentStatus.optional(),
  ...paginationSchema.shape,
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type DocumentParams = z.infer<typeof documentParamsSchema>;
export type DocumentQuery = z.infer<typeof documentQuerySchema>;
