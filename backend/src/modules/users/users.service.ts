import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import { logAuditAction } from "../../lib/audit.js";
import type { UpdateUserInput } from "../../common/validators/user.validators.js";

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

  if (input.email && input.email.toLowerCase() !== user.email) {
    const emailConflict = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (emailConflict) {
      throw new AppError(
        "An account with this email address already exists.",
        409,
      );
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: input.fullName,
      email: input.email ? input.email.toLowerCase() : undefined,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isEmailVerified: true,
      mfaEnabled: true,
      updatedAt: true,
    },
  });

  logAuditAction({
    userId,
    action: "USER_PROFILE_UPDATED",
    entityType: "User",
    entityId: userId,
    metadata: { fieldsUpdated: Object.keys(input) },
  });

  return updatedUser;
}
