import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import { logAuditAction } from "../../lib/audit.js";
import { hashPassword } from "../../lib/password.js";
import { PAGINATION_CONFIG } from "../../config/constants.js";
import type { UserQuery } from "../../common/validators/user.validators.js";
import type { AuditLogQuery } from "../../common/validators/audit-log.validators.js";

export async function getDashboardStats(organizationId?: string) {
  const userWhere: Prisma.UserWhereInput = organizationId ? { organizationId } : {};
  const adminUserWhere: Prisma.UserWhereInput = organizationId ? { organizationId, role: "ORGANIZATION_ADMIN" } : { role: "ORGANIZATION_ADMIN" };
  const jobWhere: Prisma.JobPostWhereInput = organizationId ? { organizationId } : {};
  const appWhere: Prisma.ApplicationWhereInput = organizationId ? { jobPost: { organizationId } } : {};

  const [
    totalUsers,
    totalAdmins,
    jobsByStatus,
    applicationsByStatus,
    recentApplications,
    distinctApplicants
  ] = await Promise.all([
    prisma.user.count({ where: userWhere }),
    prisma.user.count({ where: adminUserWhere }),
    prisma.jobPost.groupBy({
      by: ['status'],
      where: jobWhere,
      _count: { id: true }
    }),
    prisma.application.groupBy({
      by: ['status'],
      where: appWhere,
      _count: { id: true }
    }),
    prisma.application.findMany({
      where: appWhere,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: { select: { fullName: true } },
        jobPost: { select: { title: true } }
      }
    }),
    prisma.application.groupBy({
      by: ['candidateId'],
      where: appWhere
    })
  ]);

  const totalJobPosts = jobsByStatus.reduce((acc, curr) => acc + curr._count.id, 0);
  const totalApplications = applicationsByStatus.reduce((acc, curr) => acc + curr._count.id, 0);

  return {
    totalUsers: totalUsers + distinctApplicants.length,
    totalJobPosts,
    totalApplications,
    applicationsByStatus: applicationsByStatus.map(a => ({ status: a.status, count: a._count.id })),
    users: {
      total: totalUsers + distinctApplicants.length,
      candidates: distinctApplicants.length,
      admins: totalAdmins
    },
    jobs: jobsByStatus.map(j => ({ status: j.status, count: j._count.id })),
    applications: applicationsByStatus.map(a => ({ status: a.status, count: a._count.id })),
    recentApplications: recentApplications.map(a => ({
      id: a.id,
      candidateName: a.candidate?.fullName || 'Anonymous Candidate',
      jobTitle: a.jobPost?.title || 'Unknown Position',
      status: a.status,
      createdAt: a.createdAt
    }))
  };
}

export async function getUsers(organizationId: string | undefined, query: UserQuery) {
  const page = query.page ?? PAGINATION_CONFIG.DEFAULT_PAGE;
  const limit = query.limit ?? PAGINATION_CONFIG.DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = organizationId ? { organizationId } : {};
  if (query.role) where.role = query.role;
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.search) {
    where.OR = [
      { fullName: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        mfaEnabled: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: { applications: true }
        }
      }
    }),
  ]);

  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getUserById(organizationId: string | undefined, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...(organizationId ? { organizationId } : {}) },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      isEmailVerified: true,
      mfaEnabled: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { applications: true, createdJobPosts: true } }
    }
  });

  if (!user) throw new AppError("User not found", 404);
  return user;
}

export async function toggleUserActive(organizationId: string | undefined, userId: string, isActive: boolean) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ...(organizationId ? { organizationId } : {}) },
  });
  if (!user) throw new AppError("User not found", 404);

  if (!isActive) {
    await prisma.authSession.updateMany({
      where: { userId, ...(organizationId ? { user: { organizationId } } : {}), revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  const result = await prisma.user.updateMany({
    where: { id: userId, ...(organizationId ? { organizationId } : {}) },
    data: { isActive }
  });

  if (result.count === 0) {
    throw new AppError("User not found", 404);
  }

  const updatedUser = await prisma.user.findFirst({
    where: { id: userId, ...(organizationId ? { organizationId } : {}) },
    select: { id: true, fullName: true, email: true, isActive: true },
  });

  logAuditAction({
    userId,
    organizationId,
    action: "USER_ACTIVE_TOGGLED",
    entityType: "User",
    entityId: userId,
    metadata: { isActive },
  });

  return updatedUser!;
}

export async function getAuditLogs(organizationId: string | undefined, query: AuditLogQuery) {
  const page = query.page ?? PAGINATION_CONFIG.DEFAULT_PAGE;
  const limit = query.limit ?? PAGINATION_CONFIG.DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = organizationId ? { organizationId } : {};
  if (query.userId) where.userId = query.userId;
  if (query.action) where.action = query.action;
  if (query.entityType) where.entityType = query.entityType;
  if (query.entityId) where.entityId = query.entityId;
  
  if (query.startDate || query.endDate) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (query.startDate) createdAt.gte = query.startDate;
    if (query.endDate) createdAt.lte = query.endDate;
    where.createdAt = createdAt;
  }

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true } }
      }
    }),
  ]);

  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function createOrgUser(
  organizationId: string,
  input: { fullName: string; email: string; password: string; role?: "CANDIDATE" | "ORGANIZATION_ADMIN" },
  createdById: string,
) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existingUser) {
    throw new AppError("A user with this email address already exists.", 409);
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role || "ORGANIZATION_ADMIN",
      organizationId,
      isEmailVerified: true,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      organizationId: true,
      createdAt: true,
    },
  });

  logAuditAction({
    userId: createdById,
    organizationId,
    action: "ADMIN_USER_CREATED",
    entityType: "User",
    entityId: user.id,
    metadata: { role: user.role, email: user.email },
  });

  return user;
}
