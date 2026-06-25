import { z } from 'zod';

import { paginationSchema, sortOrderSchema } from './shared.validators.js';

// ---------------------------------------------------------------------------
// Prisma enum: UserRole
// ---------------------------------------------------------------------------
export const userRoleEnum = z.enum(['CANDIDATE', 'ADMIN']);

// ---------------------------------------------------------------------------
// Strong password regex components:
//   - min 8 chars
//   - at least 1 uppercase, 1 lowercase, 1 digit, 1 special character
// ---------------------------------------------------------------------------
const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((val) => /[a-z]/.test(val), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((val) => /\d/.test(val), {
    message: 'Password must contain at least one digit',
  })
  .refine((val) => /[^A-Za-z0-9]/.test(val), {
    message: 'Password must contain at least one special character',
  });

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
export const registerUserSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100),
  email: z.string().email(),
  password: strongPasswordSchema,
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

// ---------------------------------------------------------------------------
// Update profile (strict – rejects unknown keys)
// ---------------------------------------------------------------------------
export const updateUserSchema = z
  .object({
    fullName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
  })
  .strict();

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ---------------------------------------------------------------------------
// Query / list users
// ---------------------------------------------------------------------------
export const userQuerySchema = z.object({
  role: userRoleEnum.optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  ...paginationSchema.shape,
  sortBy: z
    .enum(['createdAt', 'fullName', 'email'])
    .default('createdAt')
    .optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type UserQuery = z.infer<typeof userQuerySchema>;
