import { z } from "zod";
import { cuidSchema, strongPasswordSchema } from "./shared.validators.js";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export type ResetPasswordRequestInput = z.infer<
  typeof resetPasswordRequestSchema
>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: strongPasswordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const mfaVerifySchema = z.object({
  code: z
    .string()
    .length(6, "MFA code must be exactly 6 digits")
    .regex(/^\d{6}$/, "MFA code must contain only digits"),
});

export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

export const mfaLoginSchema = z.object({
  mfaToken: z.string().min(1, "MFA token is required"),
  userId: cuidSchema.optional(),
  code: z
    .string()
    .length(6, "MFA code must be exactly 6 digits")
    .regex(/^\d{6}$/, "MFA code must contain only digits"),
});

export type MfaLoginInput = z.infer<typeof mfaLoginSchema>;
