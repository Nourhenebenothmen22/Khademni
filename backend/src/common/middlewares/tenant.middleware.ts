import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import { AppError } from "../errors/app-error.js";
import { logAuditAction } from "../../lib/audit.js";

/**
 * Enforces tenant isolation for organization-scoped endpoints.
 * Ensures the requesting ORGANIZATION_ADMIN belongs strictly to the requested organization.
 */
export const requireTenantAccess = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    return next(new AppError("Authentication required.", 401));
  }

  if (req.user.role !== "ORGANIZATION_ADMIN") {
    return next(new AppError("Forbidden. Organization administrator access required.", 403));
  }

  if (!req.user.organizationId) {
    return next(new AppError("Forbidden. User is not assigned to an organization.", 403));
  }

  const requestedOrgId = (
    req.params.organizationId ||
    req.params.orgId ||
    (req.baseUrl?.includes("/organizations") && req.params.id ? req.params.id : undefined) ||
    req.query.organizationId ||
    req.query.orgId ||
    req.headers["x-organization-id"] ||
    req.headers["x-tenant-id"]
  ) as string | undefined;

  if (requestedOrgId && req.user.organizationId !== requestedOrgId) {
    logAuditAction({
      userId: req.user.userId,
      organizationId: req.user.organizationId,
      action: "CROSS_TENANT_ACCESS_ATTEMPT",
      entityType: "Organization",
      entityId: requestedOrgId,
      metadata: {
        userOrgId: req.user.organizationId,
        requestedOrgId,
        path: req.originalUrl,
        method: req.method,
      },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return next(new AppError("Forbidden. Cross-tenant access is strictly prohibited.", 403));
  }

  next();
};

