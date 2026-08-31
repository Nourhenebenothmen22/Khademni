import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from '../../lib/email.js';
import { logAuditAction } from '../../lib/audit.js';
import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import {
  signAccessToken,
  signRefreshToken,
  signMfaPendingToken,
  verifyMfaPendingToken,
  verifyRefreshToken,
} from "../../lib/jwt.js";
import { generateRandomToken, hashToken } from "../../lib/token.js";
import { encrypt, decrypt } from "../../lib/encryption.js";
import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import {
  COOKIE_CONFIG,
  SECURITY_CONFIG,
  TOKEN_EXPIRATION_CONFIG,
} from "../../config/constants.js";
import type {
  LoginInput,
  MfaLoginInput,
  MfaVerifyInput,
  VerifyEmailInput,
} from "../../common/validators/auth.validators.js";
import type { RegisterUserInput } from "../../common/validators/user.validators.js";

export function getAvailableRoles() {
  return [
    {
      role: "CANDIDATE" as const,
      label: "Candidate / Teacher",
      description: "Browse academic job vacancies, submit CV applications, and track interview invitations.",
      requiresOrganization: false,
    },
    {
      role: "ORGANIZATION_ADMIN" as const,
      label: "School / Institution Administrator",
      description: "Create and manage your school recruitment workspace, publish job offers, run AI matching, and schedule interviews.",
      requiresOrganization: true,
    },
  ];
}

export async function registerUser(input: RegisterUserInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existingUser) {
    throw new AppError(
      "An account with this email address already exists.",
      409,
    );
  }

  const passwordHash = await hashPassword(input.password);
  const rawVerificationToken = generateRandomToken();
  const emailVerificationTokenHash = hashToken(rawVerificationToken);
  const emailVerificationExpiresAt = new Date(
    Date.now() + TOKEN_EXPIRATION_CONFIG.EMAIL_VERIFICATION_HOURS * 60 * 60 * 1000,
  );

  const isOrgAdmin = input.role === "ORGANIZATION_ADMIN";

  const user = await prisma.$transaction(async (tx) => {
    let organizationId: string | null = null;

    if (isOrgAdmin) {
      const orgName = input.organizationName!.trim();
      let slug = (
        input.organizationSlug?.trim().toLowerCase() ||
        orgName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") ||
        "school"
      );

      const existingOrgBySlug = await tx.organization.findUnique({
        where: { slug },
      });
      if (existingOrgBySlug) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }

      if (input.organizationDomain?.trim()) {
        const existingOrgByDomain = await tx.organization.findUnique({
          where: { domain: input.organizationDomain.trim() },
        });
        if (existingOrgByDomain) {
          throw new AppError(
            "An organization with this domain already exists.",
            409,
          );
        }
      }

      const org = await tx.organization.create({
        data: {
          name: orgName,
          slug,
          domain: input.organizationDomain?.trim() || null,
          website: input.organizationWebsite?.trim() || (input.organizationDomain?.startsWith("http") ? input.organizationDomain.trim() : null),
          description: input.organizationDescription?.trim() || null,
          location: input.organizationLocation?.trim() || null,
          isActive: true,
        },
      });

      organizationId = org.id;
    }

    return tx.user.create({
      data: {
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        passwordHash,
        role: isOrgAdmin ? "ORGANIZATION_ADMIN" : "CANDIDATE",
        organizationId: isOrgAdmin ? organizationId : null,
        isEmailVerified: false,
        emailVerificationTokenHash,
        emailVerificationExpiresAt,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        organizationId: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });
  });

  sendVerificationEmail(user.email, user.fullName, rawVerificationToken);

  const isDev = env.NODE_ENV !== "production";

  return {
    user,
    ...(isDev ? { verificationToken: rawVerificationToken } : {}),
  };
}

export async function verifyEmail(input: VerifyEmailInput) {
  const tokenHash = hashToken(input.token);

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: {
        gt: new Date(),
      },
    },
    include: {
      organization: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("Invalid or expired email verification token.", 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    },
  });

  sendWelcomeEmail(user.email, user.fullName, user.organization?.name);

  return { message: "Email address verified successfully." };
}

export async function loginUser(
  input: LoginInput,
  ipAddress?: string,
  userAgent?: string,
) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!user || !user.isActive) {
    throw new AppError("Invalid email address or password.", 401);
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(
      `Account is locked due to multiple failed login attempts. Try again after ${user.lockedUntil.toISOString()}`,
      423,
    );
  }

  const isPasswordValid = await verifyPassword(
    input.password,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    let lockedUntil: Date | null = null;

    if (failedLoginAttempts >= SECURITY_CONFIG.MAX_FAILED_LOGIN_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + SECURITY_CONFIG.ACCOUNT_LOCKOUT_MS);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts,
        lockedUntil,
      },
    });

    throw new AppError("Invalid email address or password.", 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });

  if (user.mfaEnabled) {
    // Revoke pre-existing active sessions so old refresh tokens cannot bypass MFA
    await prisma.authSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const mfaToken = await signMfaPendingToken({
      userId: user.id,
      role: user.role,
      organizationId: user.organizationId ?? undefined,
    });

    return {
      mfaRequired: true,
      userId: user.id,
      mfaToken,
      message: "Multi-factor authentication code required.",
    };
  }

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    organizationId: user.organizationId ?? undefined,
  });
  const refreshToken = await signRefreshToken({
    userId: user.id,
    role: user.role,
    organizationId: user.organizationId ?? undefined,
  });
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE_MS);

  await prisma.authSession.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  logAuditAction({
    userId: user.id,
    organizationId: user.organizationId ?? undefined,
    action: 'LOGIN',
    entityType: 'User',
    entityId: user.id,
    ipAddress,
    userAgent,
  });

  return {
    mfaRequired: false,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId ?? null,
      isEmailVerified: user.isEmailVerified,
      mfaEnabled: user.mfaEnabled,
    },
  };
}

export async function loginMfa(
  input: MfaLoginInput,
  ipAddress?: string,
  userAgent?: string,
) {
  let mfaPayload;
  try {
    mfaPayload = await verifyMfaPendingToken(input.mfaToken);
  } catch {
    throw new AppError("MFA session expired or invalid. Please log in again.", 401);
  }

  const userId = mfaPayload.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    throw new AppError(
      "MFA authentication is not configured for this user.",
      400,
    );
  }

  const result = verifySync({
    token: input.code,
    secret: decrypt(user.mfaSecret),
  });

  if (!result.valid) {
    throw new AppError("Invalid MFA verification code.", 401);
  }

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    organizationId: user.organizationId ?? undefined,
  });
  const refreshToken = await signRefreshToken({
    userId: user.id,
    role: user.role,
    organizationId: user.organizationId ?? undefined,
  });
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE_MS);

  await prisma.authSession.create({
    data: {
      userId: user.id,
      refreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  logAuditAction({
    userId: user.id,
    organizationId: user.organizationId ?? undefined,
    action: 'LOGIN_MFA_SUCCESS',
    entityType: 'User',
    entityId: user.id,
    ipAddress,
    userAgent,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId ?? null,
      isEmailVerified: user.isEmailVerified,
      mfaEnabled: user.mfaEnabled,
    },
  };
}

/**
 * Rotates access and refresh tokens while defending against race conditions and token reuse attacks.
 * Uses an interactive Prisma transaction, optimistic session claiming, and a 10s grace period window.
 */
export async function refreshSession(
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string,
) {
  const payload = await verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);
  const GRACE_PERIOD_MS = SECURITY_CONFIG.TOKEN_ROTATION_GRACE_PERIOD_MS;


  return prisma.$transaction(async (tx) => {
    const now = new Date();

    // 1. Atomic Session Claiming: Try to claim & revoke the active, non-expired session in one atomic statement
    const claimed = await tx.authSession.updateMany({
      where: {
        refreshTokenHash: tokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });

    if (claimed.count === 1) {
      // Successful claim: This request won the atomic execution race.
      // Re-read the user from the database to ensure we use current role/status — never stale JWT payload claims.
      const currentUser = await tx.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, isActive: true, role: true, organizationId: true },
      });

      if (!currentUser || !currentUser.isActive) {
        // Account deactivated or deleted — revoke all sessions for this user
        await tx.authSession.updateMany({
          where: { userId: payload.userId, revokedAt: null },
          data: { revokedAt: now },
        });
        throw new AppError("Account is deactivated or no longer exists.", 401);
      }

      const newAccessToken = await signAccessToken({
        userId: currentUser.id,
        role: currentUser.role,
        organizationId: currentUser.organizationId ?? undefined,
      });

      const newRefreshToken = await signRefreshToken({
        userId: currentUser.id,
        role: currentUser.role,
        organizationId: currentUser.organizationId ?? undefined,
      });

      const newRefreshTokenHash = hashToken(newRefreshToken);
      const newExpiresAt = new Date(Date.now() + COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE_MS);

      await tx.authSession.create({
        data: {
          userId: currentUser.id,
          refreshTokenHash: newRefreshTokenHash,
          ipAddress: ipAddress ?? undefined,
          userAgent: userAgent ?? undefined,
          expiresAt: newExpiresAt,
        },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    }

    // 2. Fallback check: Session was not claimed (already revoked, expired, or non-existent)
    const session = await tx.authSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session || session.expiresAt < now) {
      throw new AppError("Invalid or expired refresh token session.", 401);
    }

    // 3. Grace Period & Breach Detection for Already-Revoked Tokens
    if (session.revokedAt) {
      const elapsedMs = now.getTime() - session.revokedAt.getTime();

      // Case A: Concurrent retry within grace period -> Issue new tokens gracefully without triggering breach lockout
      if (elapsedMs <= GRACE_PERIOD_MS) {
        const newAccessToken = await signAccessToken({
          userId: payload.userId,
          role: payload.role,
          organizationId: payload.organizationId,
        });

        const newRefreshToken = await signRefreshToken({
          userId: payload.userId,
          role: payload.role,
          organizationId: payload.organizationId,
        });

        const newRefreshTokenHash = hashToken(newRefreshToken);
        const newExpiresAt = new Date(Date.now() + COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE_MS);

        await tx.authSession.create({
          data: {
            userId: payload.userId,
            refreshTokenHash: newRefreshTokenHash,
            ipAddress: ipAddress ?? session.ipAddress ?? undefined,
            userAgent: userAgent ?? session.userAgent ?? undefined,
            expiresAt: newExpiresAt,
          },
        });

        return {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        };
      }

      // Case B: Token reuse attempt outside 10s grace period -> Breach Attack! Revoke all user sessions
      await tx.authSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: now },
      });

      logAuditAction({
        userId: session.userId,
        organizationId: session.user?.organizationId ?? undefined,
        action: "SECURITY_BREACH_REFRESH_TOKEN_REUSE",
        entityType: "AuthSession",
        entityId: session.id,
        metadata: {
          tokenHash,
          elapsedMs,
          revokedAt: session.revokedAt,
        },
        ipAddress,
        userAgent,
      });

      throw new AppError(
        "Security alert: Refresh token reuse detected. All active sessions invalidated.",
        401,
      );
    }

    throw new AppError("Invalid or expired refresh token session.", 401);
  }, { timeout: 45000, maxWait: 25000 });
}

export async function logoutSession(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);

  await prisma.authSession.updateMany({
    where: { refreshTokenHash: tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { message: "Logged out successfully." };
}

export async function setupMfa(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  const secret = generateSecret();
  const otpauthUrl = generateURI({
    issuer: "Intelligent Teacher Recruitment Platform",
    label: user.email,
    secret,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  await prisma.user.update({
    where: { id: userId },
    data: { mfaSecret: encrypt(secret) },
  });

  return {
    secret,
    qrCodeUrl: qrCodeDataUrl,
  };
}

export async function verifyMfa(userId: string, input: MfaVerifyInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.mfaSecret) {
    throw new AppError("MFA setup is not initiated for this account.", 400);
  }

  const result = verifySync({
    token: input.code,
    secret: decrypt(user.mfaSecret),
  });

  if (!result.valid) {
    throw new AppError("Invalid MFA code.", 400);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: true },
  });

  return { message: "MFA verified and enabled successfully." };
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  const rawToken = generateRandomToken();
  const hashedToken = hashToken(rawToken);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: hashedToken,
      passwordResetExpiresAt: new Date(
        Date.now() + TOKEN_EXPIRATION_CONFIG.PASSWORD_RESET_HOURS * 60 * 60 * 1000,
      ),
    },
  });

  sendPasswordResetEmail(user.email, user.fullName, rawToken);

  logAuditAction({
    userId: user.id,
    organizationId: user.organizationId ?? undefined,
    action: 'PASSWORD_RESET_REQUESTED',
    entityType: 'User',
    entityId: user.id,
  });

  return { message: 'If an account with that email exists, a password reset link has been sent.' };
}

export async function resetPassword(token: string, newPassword: string) {
  const hashedToken = hashToken(token);

  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: hashedToken,
      passwordResetExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired password reset token.', 400);
  }

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.authSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  logAuditAction({
    userId: user.id,
    organizationId: user.organizationId ?? undefined,
    action: 'PASSWORD_RESET_COMPLETED',
    entityType: 'User',
    entityId: user.id,
  });

  return { message: 'Password reset successfully. Please log in with your new password.' };
}
