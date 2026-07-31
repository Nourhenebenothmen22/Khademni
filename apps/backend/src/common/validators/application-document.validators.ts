import { z } from "zod";

import { cuidSchema, paginationSchema } from "./shared.validators.js";

export const documentTypeEnum = z.enum(["CV", "MOTIVATION_LETTER"]);

export const documentStatusEnum = z.enum([
  "UPLOADED",
  "SCANNED",
  "VALIDATED",
  "REJECTED",
]);

const allowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const allowedExtensions = [".pdf", ".doc", ".docx"] as const;

export const uploadDocumentSchema = z.object({
  type: documentTypeEnum,
  originalName: z.string().min(1).max(255),
  mimeType: z.enum(allowedMimeTypes),
  extension: z.enum(allowedExtensions),
  sizeBytes: z.number().int().min(1).max(5_242_880),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export const documentParamsSchema = z.object({
  id: cuidSchema,
  applicationId: cuidSchema,
});

export const documentQuerySchema = z.object({
  applicationId: cuidSchema.optional(),
  type: documentTypeEnum.optional(),
  status: documentStatusEnum.optional(),
  ...paginationSchema.shape,
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type DocumentParams = z.infer<typeof documentParamsSchema>;
export type DocumentQuery = z.infer<typeof documentQuerySchema>;
