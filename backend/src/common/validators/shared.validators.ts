import { z } from "zod";
import { PAGINATION_CONFIG, PASSWORD_CONFIG } from "../../config/constants.js";

export const cuidSchema = z.string().cuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION_CONFIG.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION_CONFIG.MAX_LIMIT).default(PAGINATION_CONFIG.DEFAULT_LIMIT),
});

export const sortOrderSchema = z.enum(["asc", "desc"]).default(PAGINATION_CONFIG.DEFAULT_SORT_ORDER);

export const dateSchema = z.coerce.date();

export const idParamsSchema = z.object({
  id: cuidSchema,
});

export const strongPasswordSchema = z
  .string()
  .min(PASSWORD_CONFIG.MIN_LENGTH, `Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters`)
  .max(PASSWORD_CONFIG.MAX_LENGTH, `Password must not exceed ${PASSWORD_CONFIG.MAX_LENGTH} characters`)
  .refine((val) => PASSWORD_CONFIG.REGEX_UPPERCASE.test(val), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((val) => PASSWORD_CONFIG.REGEX_LOWERCASE.test(val), {
    message: "Password must contain at least one lowercase letter",
  })
  .refine((val) => PASSWORD_CONFIG.REGEX_DIGIT.test(val), {
    message: "Password must contain at least one digit",
  })
  .refine((val) => PASSWORD_CONFIG.REGEX_SPECIAL.test(val), {
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
