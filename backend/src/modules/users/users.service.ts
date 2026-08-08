import argon2 from "argon2";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import { logAuditAction } from "../../lib/audit.js";
import { generateRandomToken, hashToken } from "../../lib/token.js";
import { sendVerificationEmail } from "../../lib/email.js";
import { saveFile, getFileStream, deleteFile, fileExists } from "../../lib/file-storage.js";
import type { UpdateUserInput, ChangePasswordInput } from "../../common/validators/user.validators.js";
import { env } from "../../config/env.js";

export function getAvatarUrl(userId: string, avatarKey: string | null): string | null {
  return avatarKey ? `${env.APP_URL}/api/v1/users/${userId}/avatar` : null;
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      avatarKey: true,
      isEmailVerified: true,
      mfaEnabled: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      organizationId: true,
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

  let validAvatarKey = user.avatarKey;
  if (validAvatarKey) {
    const exists = await fileExists(validAvatarKey);
    if (!exists) {
      validAvatarKey = null;
      await prisma.user.update({
        where: { id: userId },
        data: { avatarKey: null },
      }).catch(() => {});
    }
  }

  return {
    ...user,
    avatarKey: validAvatarKey,
    avatarUrl: getAvatarUrl(user.id, validAvatarKey),
  };
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
      avatarKey: true,
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

  return {
    ...updatedUser,
    avatarUrl: getAvatarUrl(updatedUser.id, updatedUser.avatarKey),
  };
}

export async function uploadUserAvatar(
  userId: string,
  file?: Express.Multer.File,
) {
  if (!file) {
    throw new AppError("No image file uploaded.", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  // Delete previous avatar file if exists
  if (user.avatarKey) {
    await deleteFile(user.avatarKey).catch(() => {});
  }

  const ext = path.extname(file.originalname).toLowerCase() || ".png";
  const storageKey = `avatars/users/${userId}_${Date.now()}${ext}`;

  const fileBuffer = fs.readFileSync(file.path);
  await saveFile(fileBuffer, storageKey);

  // Clean temp file
  fs.unlink(file.path, () => {});

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { avatarKey: storageKey },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      avatarKey: true,
      isEmailVerified: true,
      mfaEnabled: true,
    },
  });

  logAuditAction({
    userId,
    organizationId: user.organizationId ?? undefined,
    action: "USER_AVATAR_UPLOADED",
    entityType: "User",
    entityId: userId,
  });

  return {
    ...updatedUser,
    avatarUrl: getAvatarUrl(updatedUser.id, updatedUser.avatarKey),
  };
}

export async function deleteUserAvatar(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (user.avatarKey) {
    await deleteFile(user.avatarKey).catch(() => {});
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { avatarKey: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      avatarKey: true,
      isEmailVerified: true,
      mfaEnabled: true,
    },
  });

  logAuditAction({
    userId,
    organizationId: user.organizationId ?? undefined,
    action: "USER_AVATAR_DELETED",
    entityType: "User",
    entityId: userId,
  });

  return {
    ...updatedUser,
    avatarUrl: null,
  };
}

export async function getUserAvatarStream(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, avatarKey: true },
  });

  if (!user || !user.avatarKey) {
    throw new AppError("Avatar image not found.", 404);
  }

  const exists = await fileExists(user.avatarKey);
  if (!exists) {
    throw new AppError("Avatar file not found on disk.", 404);
  }

  const stream = getFileStream(user.avatarKey);
  const ext = path.extname(user.avatarKey).toLowerCase();
  let mimeType = "image/png";
  if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
  if (ext === ".webp") mimeType = "image/webp";

  return { stream, mimeType };
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
