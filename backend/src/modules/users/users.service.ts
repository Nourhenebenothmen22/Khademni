import argon2 from "argon2";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import { logAuditAction } from "../../lib/audit.js";
import { generateRandomToken, hashToken } from "../../lib/token.js";
import { sendVerificationEmail } from "../../lib/email.js";
import type { UpdateUserInput, ChangePasswordInput } from "../../common/validators/user.validators.js";

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isEmailVerified: true,
      mfaEnabled: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      _count: {
        select: {
          applications: true,
          createdJobPosts: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User profile not found.", 404);
  }

  return user;
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserInput,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError("User profile not found.", 404);
  }

  const emailChanged = Boolean(input.email && input.email.toLowerCase() !== user.email);
  let rawVerificationToken: string | undefined;
  let emailVerificationTokenHash: string | undefined;
  let emailVerificationExpiresAt: Date | undefined;

  if (emailChanged) {
    const emailConflict = await prisma.user.findUnique({
      where: { email: input.email!.toLowerCase() },
    });

    if (emailConflict) {
      throw new AppError(
        "An account with this email address already exists.",
        409,
      );
    }

    rawVerificationToken = generateRandomToken();
    emailVerificationTokenHash = hashToken(rawVerificationToken);
    emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: input.fullName,
      email: input.email ? input.email.toLowerCase() : undefined,
      ...(emailChanged
        ? {
            isEmailVerified: false,
            emailVerificationTokenHash,
            emailVerificationExpiresAt,
          }
        : {}),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isEmailVerified: true,
      mfaEnabled: true,
      updatedAt: true,
      organization: {
        select: {
          name: true,
        },
      },
    },
  });

  if (emailChanged && rawVerificationToken) {
    sendVerificationEmail(
      updatedUser.email,
      updatedUser.fullName,
      rawVerificationToken,
      updatedUser.organization?.name,
    );
  }

  logAuditAction({
    userId,
    organizationId: user.organizationId ?? undefined,
    action: "USER_PROFILE_UPDATED",
    entityType: "User",
    entityId: userId,
    metadata: { fieldsUpdated: Object.keys(input), emailChanged },
  });

  return updatedUser;
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError("User profile not found.", 404);
  }

  const isPasswordValid = await argon2.verify(user.passwordHash, input.currentPassword);
  if (!isPasswordValid) {
    throw new AppError("Current password is incorrect.", 400);
  }

  const newPasswordHash = await argon2.hash(input.newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
    }),
    prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  logAuditAction({
    userId,
    organizationId: user.organizationId ?? undefined,
    action: "PASSWORD_CHANGED",
    entityType: "User",
    entityId: userId,
  });

  return { message: "Password changed successfully. Please log in again." };
}

