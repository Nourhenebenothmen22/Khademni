import { Router } from "express";
import { authenticate, requireRole } from "../../common/middlewares/auth.middleware.js";
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

router.use(authenticate);

router.get("/me", organizationsController.getMyOrganizationController);

router.post(
  "/",
  requireRole("ADMIN"),
  validateBody(createOrganizationSchema),
  organizationsController.createOrganizationController,
);

router.get(
  "/",
  requireRole("ADMIN"),
  validateQuery(organizationQuerySchema),
  organizationsController.getOrganizationsController,
);

router.get(
  "/:id",
  requireRole("ADMIN"),
  validateParams(organizationParamsSchema),
  organizationsController.getOrganizationByIdController,
);

router.patch(
  "/:id",
  requireRole("ADMIN"),
  validateParams(organizationParamsSchema),
  validateBody(updateOrganizationSchema),
  organizationsController.updateOrganizationController,
);

export { router as organizationsRouter };
