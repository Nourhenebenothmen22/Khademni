import { z } from 'zod';
import { cuidSchema, dateSchema, paginationSchema, sortOrderSchema } from './shared.validators.js';

export const createAuditLogSchema = z.object({
  action: z.string().min(1).max(100),
  entityType: z.string().min(1).max(100),
  entityId: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const auditLogQuerySchema = z.object({
  userId: cuidSchema.optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  ...paginationSchema.shape,
  sortBy: z.enum(['createdAt']).default('createdAt').optional(),
  sortOrder: sortOrderSchema.optional(),
});

export const auditLogParamsSchema = z.object({
  id: cuidSchema,
});

export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
export type AuditLogParams = z.infer<typeof auditLogParamsSchema>;
