import { z } from 'zod';
import { cuidSchema, paginationSchema, sortOrderSchema } from './shared.validators.js';

export const notificationQuerySchema = z.object({
  isRead: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
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
