import { z } from "zod";

import {
  paginationSchema,
  sortOrderSchema,
  strongPasswordSchema,
} from "./shared.validators.js";

export const userRoleEnum = z.enum(["CANDIDATE", "ADMIN"]);

export const registerUserSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(120),
  email: z.string().email(),
  password: strongPasswordSchema,
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export const updateUserSchema = z
  .object({
    fullName: z.string().min(2).max(120).optional(),
    email: z.string().email().optional(),
  })
  .strict();

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userQuerySchema = z.object({
  role: userRoleEnum.optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  ...paginationSchema.shape,
  sortBy: z
    .enum(["createdAt", "fullName", "email"])
    .default("createdAt")
    .optional(),
  sortOrder: sortOrderSchema.optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: strongPasswordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export type UserQuery = z.infer<typeof userQuerySchema>;

