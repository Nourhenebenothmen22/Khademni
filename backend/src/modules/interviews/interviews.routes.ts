import { Router } from "express";
import { authenticate, requireRole } from "../../common/middlewares/auth.middleware.js";
import { requireTenantAccess } from "../../common/middlewares/tenant.middleware.js";
import { validateBody, validateQuery, validateParams } from "../../common/middlewares/validate.middleware.js";
import {
  scheduleInterviewSchema,
  rescheduleInterviewSchema,
  cancelInterviewSchema,
  submitScorecardSchema,
  interviewQuerySchema,
  interviewParamsSchema,
} from "../../common/validators/interview.validators.js";
import { webhookRateLimiter } from "../../common/middlewares/rate-limit.middleware.js";
import * as interviewsController from "./interviews.controller.js";

const router = Router();

// Public webhook route for Brevo deliverability events (rate limited & HMAC signature protected)
router.post("/webhooks/brevo", webhookRateLimiter, interviewsController.brevoWebhookController);

// Authenticated routes
router.use(authenticate);

router.get(
  "/me",
  requireRole("CANDIDATE"),
  validateQuery(interviewQuerySchema),
  interviewsController.getMyInterviewsController,
);

router.post(
  "/",
  requireRole("ORGANIZATION_ADMIN"),
  requireTenantAccess,
  validateBody(scheduleInterviewSchema),
  interviewsController.scheduleInterviewController,
);

router.get(
  "/",
  requireRole("ORGANIZATION_ADMIN"),
  requireTenantAccess,
  validateQuery(interviewQuerySchema),
  interviewsController.getInterviewsController,
);

router.get(
  "/:id",
  validateParams(interviewParamsSchema),
  interviewsController.getInterviewByIdController,
);

router.patch(
  "/:id/reschedule",
  requireRole("ORGANIZATION_ADMIN"),
  requireTenantAccess,
  validateParams(interviewParamsSchema),
  validateBody(rescheduleInterviewSchema),
  interviewsController.rescheduleInterviewController,
);

router.post(
  "/:id/cancel",
  requireRole("ORGANIZATION_ADMIN"),
  requireTenantAccess,
  validateParams(interviewParamsSchema),
  validateBody(cancelInterviewSchema),
  interviewsController.cancelInterviewController,
);

router.post(
  "/:id/scorecards",
  requireRole("ORGANIZATION_ADMIN"),
  requireTenantAccess,
  validateParams(interviewParamsSchema),
  validateBody(submitScorecardSchema),
  interviewsController.submitScorecardController,
);

router.get(
  "/:id/calendar.ics",
  validateParams(interviewParamsSchema),
  interviewsController.downloadIcsController,
);

export { router as interviewsRouter };
