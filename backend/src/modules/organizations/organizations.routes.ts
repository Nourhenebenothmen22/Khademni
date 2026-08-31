import { Router } from "express";
import { authenticate, requireRole } from "../../common/middlewares/auth.middleware.js";
import { requireTenantAccess } from "../../common/middlewares/tenant.middleware.js";
import { avatarUpload, validateAndSaveAvatarUpload } from "../../common/middlewares/avatar-upload.middleware.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../common/middlewares/validate.middleware.js";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationParamsSchema,
  organizationQuerySchema,
} from "../../common/validators/organization.validators.js";
import * as organizationsController from "./organizations.controller.js";

const router = Router();

// Public logo streaming route for <img> tags
router.get("/:id/logo", organizationsController.getLogoController);

// Authenticated organization routes
router.use(authenticate);

router.get(
  "/me",
  requireRole("ORGANIZATION_ADMIN"),
  organizationsController.getMyOrganizationController,
);

router.patch(
  "/me",
  requireRole("ORGANIZATION_ADMIN"),
  validateBody(updateOrganizationSchema),
  organizationsController.updateMyOrganizationController,
);

router.post(
  "/",
  requireRole("ORGANIZATION_ADMIN"),
  validateBody(createOrganizationSchema),
  organizationsController.createOrganizationController,
);

router.get(
  "/",
  requireRole("ORGANIZATION_ADMIN"),
  validateQuery(organizationQuerySchema),
  organizationsController.getOrganizationsController,
);

router.get(
  "/:id",
  requireRole("ORGANIZATION_ADMIN"),
  requireTenantAccess,
  validateParams(organizationParamsSchema),
  organizationsController.getOrganizationByIdController,
);

router.patch(
  "/:id",
  requireRole("ORGANIZATION_ADMIN"),
  requireTenantAccess,
  validateParams(organizationParamsSchema),
  validateBody(updateOrganizationSchema),
  organizationsController.updateOrganizationController,
);

router.post(
  "/:id/logo",
  requireRole("ORGANIZATION_ADMIN"),
  requireTenantAccess,
  validateParams(organizationParamsSchema),
  avatarUpload.single("file"),
  validateAndSaveAvatarUpload,
  organizationsController.uploadLogoController,
);

router.delete(
  "/:id/logo",
  requireRole("ORGANIZATION_ADMIN"),
  requireTenantAccess,
  validateParams(organizationParamsSchema),
  organizationsController.deleteLogoController,
);

export { router as organizationsRouter };
