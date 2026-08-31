import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middlewares/auth.middleware.js";
import type { UserQuery } from "../../common/validators/user.validators.js";
import type { AuditLogQuery } from "../../common/validators/audit-log.validators.js";
import { AppError } from "../../common/errors/app-error.js";
import * as adminService from "./admin.service.js";

/**
 * Extracts the authenticated user's organizationId.
 * For SuperAdmins, organization context is optional unless explicitly creating a tenant-scoped resource.
 * For Organization Admins, organization context is strictly required.
 */
function getOrganizationId(req: AuthenticatedRequest): string {
  const orgId = req.user?.organizationId;
  if (!orgId || req.user?.role !== "ORGANIZATION_ADMIN") {
    throw new AppError("Organization administrator context is required.", 403);
  }
  return orgId;
}

export async function getDashboardStatsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const organizationId = getOrganizationId(req);
    const stats = await adminService.getDashboardStats(organizationId);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

export async function getUsersController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const organizationId = getOrganizationId(req);
    const result = await adminService.getUsers(organizationId, req.query as unknown as UserQuery);
    res.status(200).json({ success: true, data: result.items, meta: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function getUserByIdController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const organizationId = getOrganizationId(req);
    const { id } = req.params as { id: string };
    const user = await adminService.getUserById(organizationId, id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserActiveController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const organizationId = getOrganizationId(req);
    const { id } = req.params as { id: string };
    const { isActive } = req.body;
    const user = await adminService.toggleUserActive(organizationId, id, isActive);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const organizationId = getOrganizationId(req);
    const result = await adminService.getAuditLogs(organizationId, req.query as unknown as AuditLogQuery);
    res.status(200).json({ success: true, data: result.items, meta: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function createUserController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const organizationId = getOrganizationId(req);
    const createdById = req.user!.userId;
    const user = await adminService.createOrgUser(organizationId, req.body, createdById);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}
