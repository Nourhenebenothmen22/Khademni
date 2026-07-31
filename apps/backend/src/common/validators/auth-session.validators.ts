import { z } from "zod";

import {
  cuidSchema,
  dateSchema,
  paginationSchema,
  sortOrderSchema,
} from "./shared.validators.js";

export const createAuthSessionSchema = z.object({
  userId: cuidSchema,
  refreshTokenHash: z.string().min(1),
  ipAddress: z.string().max(45).optional(),
  userAgent: z.string().max(500).optional(),
  expiresAt: dateSchema,
  revokedAt: dateSchema.optional(),
});

export const authSessionQuerySchema = z.object({
  userId: cuidSchema.optional(),
  isActive: z.coerce.boolean().optional(),
  ...paginationSchema.shape,
  sortBy: z.enum(["createdAt", "expiresAt"]).default("createdAt").optional(),
  sortOrder: sortOrderSchema.optional(),
});

export const authSessionParamsSchema = z.object({
  id: cuidSchema,
});

export type CreateAuthSessionInput = z.infer<typeof createAuthSessionSchema>;
export type AuthSessionQuery = z.infer<typeof authSessionQuerySchema>;
export type AuthSessionParams = z.infer<typeof authSessionParamsSchema>;
