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

router.use(authenticate, requireTenantAccess);

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
  requireRole("ADMIN"),
  validateQuery(applicationQuerySchema),
  applicationsController.getApplicationsController,
);

router.patch(
  "/:id/status",
  requireRole("ADMIN"),
  validateParams(applicationParamsSchema),
  validateBody(updateApplicationStatusSchema),
  applicationsController.updateApplicationStatusController,
);

router.post(
  "/:id/withdraw",
  validateParams(applicationParamsSchema),
  applicationsController.withdrawApplicationController,
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  validateParams(applicationParamsSchema),
  applicationsController.deleteApplicationController,
);

export { router as applicationsRouter };

