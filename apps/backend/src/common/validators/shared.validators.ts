import { z } from 'zod';

export const cuidSchema = z.string().cuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export const dateSchema = z.coerce.date();

export const idParamsSchema = z.object({
  id: cuidSchema,
});

export type Pagination = z.infer<typeof paginationSchema>;
export type IdParams = z.infer<typeof idParamsSchema>;
