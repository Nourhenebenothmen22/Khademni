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
import * as interviewsController from "./interviews.controller.js";

const router = Router();

// Public webhook route for Brevo deliverability events
router.post("/webhooks/brevo", interviewsController.brevoWebhookController);

// Authenticated routes
router.use(authenticate);

router.get(
  "/me",
  requireRole("CANDIDATE"),
  validateQuery(interviewQuerySchema),
  interviewsController.getMyInterviewsController,
);

router.use(requireTenantAccess);

router.post(
  "/",
  requireRole("ADMIN"),
  validateBody(scheduleInterviewSchema),
  interviewsController.scheduleInterviewController,
);

router.get(
  "/",
  requireRole("ADMIN"),
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
  requireRole("ADMIN"),
  validateParams(interviewParamsSchema),
  validateBody(rescheduleInterviewSchema),
  interviewsController.rescheduleInterviewController,
);

router.post(
  "/:id/cancel",
  requireRole("ADMIN"),
  validateParams(interviewParamsSchema),
  validateBody(cancelInterviewSchema),
  interviewsController.cancelInterviewController,
);

router.post(
  "/:id/scorecards",
  requireRole("ADMIN"),
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
