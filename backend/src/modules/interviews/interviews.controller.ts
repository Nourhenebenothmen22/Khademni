import crypto from "node:crypto";
import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middlewares/auth.middleware.js";
import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import * as interviewsService from "./interviews.service.js";
import type {
  ScheduleInterviewInput,
  RescheduleInterviewInput,
  CancelInterviewInput,
  SubmitScorecardInput,
  InterviewQuery,
} from "../../common/validators/interview.validators.js";

export async function scheduleInterviewController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const createdById = req.user!.userId;
    const organizationId = req.user!.organizationId!;
    const input = req.body as ScheduleInterviewInput;

    const interview = await interviewsService.scheduleInterview(
      createdById,
      input,
      organizationId,
    );

    res.status(201).json({
      success: true,
      data: interview,
      message: "Interview scheduled successfully and Brevo invitations sent.",
    });
  } catch (error) {
    next(error);
  }
}

export async function getInterviewsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const organizationId = req.user?.organizationId ?? undefined;

    if (!organizationId || req.user?.role !== "ORGANIZATION_ADMIN") {
      throw new AppError("Organization administrator context is required.", 403);
    }

    const query = req.query as unknown as InterviewQuery;
    const result = await interviewsService.getInterviews(query, organizationId);

    res.json({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyInterviewsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const candidateId = req.user!.userId;
    const query = req.query as unknown as Partial<InterviewQuery>;

    const result = await interviewsService.getCandidateInterviews(candidateId, query);

    res.json({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getInterviewByIdController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const interviewId = req.params.id as string;
    const userId = req.user!.userId;
    const role = req.user!.role;
    const organizationId = req.user!.organizationId || undefined;

    const interview = await interviewsService.getInterviewById(
      interviewId,
      userId,
      role,
      organizationId,
    );

    res.json({
      success: true,
      data: interview,
    });
  } catch (error) {
    next(error);
  }
}

export async function rescheduleInterviewController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const interviewId = req.params.id as string;
    const changedById = req.user!.userId;
    const organizationId = req.user!.organizationId!;
    const input = req.body as RescheduleInterviewInput;

    const interview = await interviewsService.rescheduleInterview(
      interviewId,
      changedById,
      input,
      organizationId,
    );

    res.json({
      success: true,
      data: interview,
      message: "Interview rescheduled successfully and updated invitations sent.",
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelInterviewController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const interviewId = req.params.id as string;
    const cancelledById = req.user!.userId;
    const organizationId = req.user!.organizationId!;
    const input = req.body as CancelInterviewInput;

    const interview = await interviewsService.cancelInterview(
      interviewId,
      cancelledById,
      input,
      organizationId,
    );

    res.json({
      success: true,
      data: interview,
      message: "Interview cancelled successfully and cancellation notices dispatched.",
    });
  } catch (error) {
    next(error);
  }
}

export async function submitScorecardController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const interviewId = req.params.id as string;
    const interviewerId = req.user!.userId;
    const organizationId = req.user!.organizationId!;
    const input = req.body as SubmitScorecardInput;

    const scorecard = await interviewsService.submitScorecard(
      interviewId,
      interviewerId,
      input,
      organizationId,
    );

    res.status(201).json({
      success: true,
      data: scorecard,
      message: "Scorecard evaluation submitted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadIcsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const interviewId = req.params.id as string;
    const userId = req.user!.userId;
    const role = req.user!.role;
    const organizationId = req.user!.organizationId || undefined;

    const icsContent = await interviewsService.getIcsFileContent(
      interviewId,
      userId,
      role,
      organizationId,
    );

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="interview-${interviewId}.ics"`);
    res.send(icsContent);
  } catch (error) {
    next(error);
  }
}

export async function brevoWebhookController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const webhookSecret = env.BREVO_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature =
        (req.headers["x-brevo-signature"] as string | undefined) ||
        (req.headers["x-sib-signature"] as string | undefined) ||
        (req.headers["signature"] as string | undefined);

      if (!signature) {
        throw new AppError("Missing webhook signature header.", 401);
      }

      const rawPayload = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const computedHmac = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawPayload)
        .digest("hex");

      const sigBuffer = Buffer.from(signature.trim(), "utf-8");
      const computedBuffer = Buffer.from(computedHmac, "utf-8");

      if (
        sigBuffer.length !== computedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, computedBuffer)
      ) {
        throw new AppError("Invalid webhook signature.", 401);
      }
    } else if (env.NODE_ENV === "production") {
      throw new AppError("Webhook processing unavailable: secret unconfigured in production.", 500);
    }

    // Process Brevo email event notification payload
    const event = req.body as { event?: string; email?: string; messageId?: string };
    
    res.json({
      success: true,
      message: "Brevo webhook event received",
      event: event.event,
    });
  } catch (error) {
    next(error);
  }
}

