import { z } from 'zod';
import { cuidSchema, paginationSchema, sortOrderSchema } from './shared.validators.js';

export const notificationQuerySchema = z.object({
  isRead: z.coerce.boolean().optional(),
  type: z.string().max(50).optional(),
  ...paginationSchema.shape,
  sortBy: z.enum(['createdAt']).default('createdAt').optional(),
  sortOrder: sortOrderSchema.optional(),
});

export const notificationParamsSchema = z.object({
  id: cuidSchema,
});

export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
export type NotificationParams = z.infer<typeof notificationParamsSchema>;
