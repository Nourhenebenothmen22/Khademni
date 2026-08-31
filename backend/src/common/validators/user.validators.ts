import { z } from "zod";

import {
  paginationSchema,
  sortOrderSchema,
  strongPasswordSchema,
} from "./shared.validators.js";

export const userRoleEnum = z.enum(["CANDIDATE", "ORGANIZATION_ADMIN"]);

export const registerUserSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(120),
    email: z.string().email(),
    password: strongPasswordSchema,
    role: userRoleEnum.default("CANDIDATE").optional(),
    organizationName: z.string().min(2, "Organization name must be at least 2 characters").max(120).optional(),
    organizationSlug: z
      .string()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
      .optional(),
    organizationDomain: z.string().max(120).optional(),
    organizationWebsite: z.string().max(200).optional(),
    organizationDescription: z.string().max(2000).optional(),
    organizationLocation: z.string().max(200).optional(),
  })
  .refine(
    (data) => {
      if (data.role === "ORGANIZATION_ADMIN" && (!data.organizationName || !data.organizationName.trim())) {
        return false;
      }
      return true;
    },
    {
      message: "Organization Name is required when registering as an Organization Administrator.",
      path: ["organizationName"],
    },
  );

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

export const createOrgUserSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(120),
  email: z.string().email(),
  password: strongPasswordSchema,
  role: userRoleEnum.default("ORGANIZATION_ADMIN").optional(),
});

export type CreateOrgUserInput = z.infer<typeof createOrgUserSchema>;

export type UserQuery = z.infer<typeof userQuerySchema>;

