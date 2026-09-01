import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middlewares/auth.middleware.js";
import type { MatchingRunQuery } from "../../common/validators/matching-run.validators.js";
import { AppError } from "../../common/errors/app-error.js";
import * as matchingService from "./matching.service.js";
import * as queueService from "./matching-queue.service.js";
import * as aiModelsService from "../ai-models/ai-models.service.js";

function getOrganizationId(req: AuthenticatedRequest): string {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    throw new AppError("Organization context is required for this operation", 403);
  }
  return orgId;
}

export async function triggerMatchingController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { applicationId } = req.body;
    let { modelId } = req.body;
    if (!modelId) {
      const activeModel = await aiModelsService.getActiveModel();
      modelId = (activeModel as { id: string }).id;
    }
    const organizationId = getOrganizationId(req);
    const run = await matchingService.runMatching(applicationId, modelId, organizationId);
    res.status(200).json({ success: true, data: run });
  } catch (error) {
    next(error);
  }
}

export async function triggerJobMatchingController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { jobPostId } = req.params as { jobPostId: string };
    let { modelId } = req.body || {};
    if (!modelId) {
      const activeModel = await aiModelsService.getActiveModel();
      modelId = (activeModel as { id: string }).id;
    }
    const organizationId = getOrganizationId(req);
    const runs = await matchingService.runMatchingForJob(jobPostId, modelId, organizationId);
    res.status(200).json({ success: true, data: { processedCount: runs.length, runs } });
  } catch (error) {
    next(error);
  }
}

export async function enqueueJobMatchingController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { jobPostId } = req.params as { jobPostId: string };
    const { modelId } = req.body;
    const organizationId = getOrganizationId(req);
    const state = await queueService.enqueueJobMatching(jobPostId, modelId, organizationId);
    res.status(202).json({ success: true, data: state });
  } catch (error) {
    next(error);
  }
}

export async function getMatchingJobStatusController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { queueJobId } = req.params as { queueJobId: string };
    const organizationId = getOrganizationId(req);
    const state = await queueService.getMatchingJobStatus(queueJobId, organizationId);
    res.status(200).json({ success: true, data: state });
  } catch (error) {
    next(error);
  }
}

export async function getMatchingRunController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const organizationId = getOrganizationId(req);
    const run = await matchingService.getMatchingRun(id, organizationId);
    res.status(200).json({ success: true, data: run });
  } catch (error) {
    next(error);
  }
}

export async function getMatchingRunsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const organizationId = getOrganizationId(req);
    const result = await matchingService.getMatchingRuns(
      req.query as unknown as MatchingRunQuery,
      organizationId,
    );
    res.status(200).json({ success: true, data: result.items, meta: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function getApplicationScoreController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { applicationId } = req.params as { applicationId: string };
    const organizationId = getOrganizationId(req);
    const score = await matchingService.getApplicationScore(applicationId, organizationId);
    res.status(200).json({ success: true, data: score });
  } catch (error) {
    next(error);
  }
}
