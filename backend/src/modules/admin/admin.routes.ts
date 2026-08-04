import { Router } from "express";
import { authenticate, requireRole } from "../../common/middlewares/auth.middleware.js";
import { requireTenantAccess } from "../../common/middlewares/tenant.middleware.js";
import { validateBody, validateQuery, validateParams } from "../../common/middlewares/validate.middleware.js";
import { userQuerySchema } from "../../common/validators/user.validators.js";
import { auditLogQuerySchema } from "../../common/validators/audit-log.validators.js";
import { cuidSchema } from "../../common/validators/shared.validators.js";
import { z } from "zod";
import * as adminController from "./admin.controller.js";

const router = Router();

router.use(authenticate, requireTenantAccess, requireRole("ADMIN"));

router.get("/stats", adminController.getDashboardStatsController);

router.get("/users", validateQuery(userQuerySchema), adminController.getUsersController);

router.get("/users/:id", validateParams(z.object({ id: cuidSchema })), adminController.getUserByIdController);

router.patch(
  "/users/:id/status", 
  validateParams(z.object({ id: cuidSchema })), 
  validateBody(z.object({ isActive: z.boolean() })), 
  adminController.toggleUserActiveController
);

router.get("/audit-logs", validateQuery(auditLogQuerySchema), adminController.getAuditLogsController);

export { router as adminRouter };
