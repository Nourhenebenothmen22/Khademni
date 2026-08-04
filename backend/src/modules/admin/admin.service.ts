import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import type { UserQuery } from "../../common/validators/user.validators.js";
import type { AuditLogQuery } from "../../common/validators/audit-log.validators.js";

export async function getDashboardStats() {
  const [
    totalUsers,
    totalCandidates,
    totalAdmins,
    jobsByStatus,
    applicationsByStatus,
    recentApplications
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CANDIDATE" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.jobPost.groupBy({
      by: ['status'],
      _count: { id: true }
    }),
    prisma.application.groupBy({
      by: ['status'],
      _count: { id: true }
    }),
    prisma.application.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: { select: { fullName: true } },
        jobPost: { select: { title: true } }
      }
    })
  ]);

  return {
    users: {
      total: totalUsers,
      candidates: totalCandidates,
      admins: totalAdmins
    },
    jobs: jobsByStatus.map(j => ({ status: j.status, count: j._count.id })),
    applications: applicationsByStatus.map(a => ({ status: a.status, count: a._count.id })),
    recentApplications: recentApplications.map(a => ({
      id: a.id,
      candidateName: a.candidate.fullName,
      jobTitle: a.jobPost.title,
      status: a.status,
      createdAt: a.createdAt
    }))
  };
}

export async function getUsers(query: UserQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: any = {};
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

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

export async function toggleUserActive(userId: string, isActive: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  if (!isActive) {
    await prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: { id: true, fullName: true, email: true, isActive: true }
  });

  return updatedUser;
}

export async function getAuditLogs(query: AuditLogQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query.userId) where.userId = query.userId;
  if (query.action) where.action = query.action;
  if (query.entityType) where.entityType = query.entityType;
  if (query.entityId) where.entityId = query.entityId;
  
  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) where.createdAt.gte = query.startDate;
    if (query.endDate) where.createdAt.lte = query.endDate;
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
