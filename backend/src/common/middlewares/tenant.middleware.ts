import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import { AppError } from "../errors/app-error.js";
import { logAuditAction } from "../../lib/audit.js";

/**
 * Enforces tenant isolation for organization-scoped endpoints.
 * Ensures the requesting user belongs to the requested organization or has global admin clearance.
 */
export const requireTenantAccess = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    return next(new AppError("Authentication required.", 401));
  }

  const requestedOrgId = (req.params.organizationId || req.query.organizationId || req.headers["x-organization-id"]) as string | undefined;

  if (requestedOrgId && req.user.organizationId && req.user.organizationId !== requestedOrgId) {
    logAuditAction({
      userId: req.user.userId,
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

