import { z } from "zod";

export const cuidSchema = z.string().cuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

export const dateSchema = z.coerce.date();

export const idParamsSchema = z.object({
  id: cuidSchema,
});

export const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((val) => /[A-Z]/.test(val), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((val) => /[a-z]/.test(val), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((val) => /\d/.test(val), {
    message: "Password must contain at least one digit",
  })
  .refine((val) => /[^A-Za-z0-9]/.test(val), {
    message: "Password must contain at least one special character",
  });

export const atLeastOneFieldRefine = <T extends Record<string, unknown>>(
  data: T,
  ctx: z.RefinementCtx,
) => {
  const hasAtLeastOne = Object.values(data).some((v) => v !== undefined);
  if (!hasAtLeastOne) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field must be provided",
    });
  }
};

export type Pagination = z.infer<typeof paginationSchema>;
export type IdParams = z.infer<typeof idParamsSchema>;
