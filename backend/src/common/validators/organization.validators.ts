import { z } from "zod";
import { cuidSchema, paginationSchema, sortOrderSchema } from "./shared.validators.js";

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  domain: z.string().max(120).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").optional(),
  domain: z.string().max(120).nullable().optional(),
  website: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  industry: z.string().max(100).nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().max(120).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  socialLinks: z.record(z.string(), z.string()).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const organizationParamsSchema = z.object({
  id: cuidSchema,
});

export const organizationQuerySchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
  isActive: z
    .preprocess((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return val;
    }, z.boolean())
    .optional(),
  sortBy: z.enum(["createdAt", "name", "slug"]).default("createdAt"),
  sortOrder: sortOrderSchema,
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type OrganizationQuery = z.infer<typeof organizationQuerySchema>;
