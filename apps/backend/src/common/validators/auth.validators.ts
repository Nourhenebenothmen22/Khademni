import { z } from 'zod';

// ---------------------------------------------------------------------------
// Strong password – same rules as registration
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
// Login
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Refresh token
// ---------------------------------------------------------------------------
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ---------------------------------------------------------------------------
// Password reset – request (email only)
// ---------------------------------------------------------------------------
export const resetPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;

// ---------------------------------------------------------------------------
// Password reset – execute
// ---------------------------------------------------------------------------
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: strongPasswordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ---------------------------------------------------------------------------
// MFA verification
// ---------------------------------------------------------------------------
export const mfaVerifySchema = z.object({
  code: z
    .string()
    .length(6, 'MFA code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'MFA code must contain only digits'),
});

export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
