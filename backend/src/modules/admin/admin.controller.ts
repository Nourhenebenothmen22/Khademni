import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middlewares/auth.middleware.js";
import type { UserQuery } from "../../common/validators/user.validators.js";
import type { AuditLogQuery } from "../../common/validators/audit-log.validators.js";
import { AppError } from "../../common/errors/app-error.js";
import * as adminService from "./admin.service.js";

/**
 * Extracts the authenticated user's organizationId from the JWT payload.
 * Returns 403 if the admin has no organization assigned.
 */
function getOrganizationId(req: AuthenticatedRequest): string {
  const organizationId = req.user?.organizationId;
  if (!organizationId) {
    throw new AppError("Admin must belong to an organization", 403);
  }
  return organizationId;
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
