import { Router } from "express";
import {
  authenticate,
  requireRole,
} from "../../common/middlewares/auth.middleware.js";
import { requireTenantAccess } from "../../common/middlewares/tenant.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../common/middlewares/validate.middleware.js";
import {
  applicationQuerySchema,
  myApplicationsQuerySchema,
  applicationParamsSchema,
  updateApplicationStatusSchema,
  downloadDocumentParamsSchema,
} from "../../common/validators/application.validators.js";
import * as applicationsController from "./applications.controller.js";

const router = Router();

router.use(authenticate);

router.get(
  "/me",
  requireRole("CANDIDATE"),
  validateQuery(myApplicationsQuerySchema),
  applicationsController.getMyApplicationsController,
);

router.get(
  "/:id/documents/:docId/download",
  validateParams(downloadDocumentParamsSchema),
  applicationsController.downloadDocumentController,
);

router.get(
  "/",
  requireRole("ORGANIZATION_ADMIN"),
  requireTenantAccess,
  validateQuery(applicationQuerySchema),
  applicationsController.getApplicationsController,
);

router.patch(
  "/:id/status",
  requireRole("ORGANIZATION_ADMIN"),
  requireTenantAccess,
  validateParams(applicationParamsSchema),
  validateBody(updateApplicationStatusSchema),
  applicationsController.updateApplicationStatusController,
);

router.post(
  "/:id/withdraw",
  requireRole("CANDIDATE"),
  validateParams(applicationParamsSchema),
  applicationsController.withdrawApplicationController,
);

router.delete(
  "/:id",
  requireRole("ORGANIZATION_ADMIN"),
  requireTenantAccess,
  validateParams(applicationParamsSchema),
  applicationsController.deleteApplicationController,
);

export { router as applicationsRouter };

