import { Router } from "express";
import { authenticate, requireRole } from "../../common/middlewares/auth.middleware.js";
import { requireTenantAccess } from "../../common/middlewares/tenant.middleware.js";
import { validateBody, validateQuery, validateParams } from "../../common/middlewares/validate.middleware.js";
import { createMatchingRunSchema, matchingRunQuerySchema, matchingRunParamsSchema } from "../../common/validators/matching-run.validators.js";
import { z } from "zod";
import * as matchingController from "./matching.controller.js";
import { cuidSchema } from "../../common/validators/shared.validators.js";

const router = Router();

router.use(authenticate, requireTenantAccess, requireRole("ADMIN"));

router.post("/run", validateBody(createMatchingRunSchema), matchingController.triggerMatchingController);

router.post(
  "/run-job/:jobPostId", 
  validateParams(z.object({ jobPostId: cuidSchema })),
  validateBody(z.object({ modelId: cuidSchema.optional() })),
  matchingController.triggerJobMatchingController
);

router.post(
  "/queue-job/:jobPostId",
  validateParams(z.object({ jobPostId: cuidSchema })),
  validateBody(z.object({ modelId: cuidSchema.optional() })),
  matchingController.enqueueJobMatchingController
);

router.get(
  "/queue-status/:queueJobId",
  matchingController.getMatchingJobStatusController
);

router.get("/runs", validateQuery(matchingRunQuerySchema), matchingController.getMatchingRunsController);

router.get("/runs/:id", validateParams(matchingRunParamsSchema), matchingController.getMatchingRunController);

router.get(
  "/scores/:applicationId", 
  validateParams(z.object({ applicationId: cuidSchema })),
  matchingController.getApplicationScoreController
);

export { router as matchingRouter };
