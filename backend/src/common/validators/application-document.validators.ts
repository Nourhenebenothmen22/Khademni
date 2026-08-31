import { z } from "zod";

import { cuidSchema, paginationSchema } from "./shared.validators.js";
import { CV_UPLOAD_CONFIG } from "../../config/constants.js";

export const documentTypeEnum = z.enum(["CV", "MOTIVATION_LETTER"]);

export const documentStatusEnum = z.enum([
  "UPLOADED",
  "SCANNED",
  "VALIDATED",
  "REJECTED",
]);

export const uploadDocumentSchema = z.object({
  type: documentTypeEnum,
  originalName: z.string().min(1).max(255),
  mimeType: z.enum(CV_UPLOAD_CONFIG.ALLOWED_MIME_TYPES),
  extension: z.enum(CV_UPLOAD_CONFIG.ALLOWED_EXTENSIONS),
  sizeBytes: z.number().int().min(1).max(CV_UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES),
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
