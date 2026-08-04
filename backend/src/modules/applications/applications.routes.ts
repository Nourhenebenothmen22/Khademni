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
  applicationParamsSchema,
  updateApplicationStatusSchema,
} from "../../common/validators/application.validators.js";
import * as applicationsController from "./applications.controller.js";

const router = Router();

router.use(authenticate, requireTenantAccess);

router.get("/me", applicationsController.getMyApplicationsController);

router.get(
  "/:id/documents/:docId/download",
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

export { router as applicationsRouter };
