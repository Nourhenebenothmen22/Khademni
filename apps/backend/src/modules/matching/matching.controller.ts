import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middlewares/auth.middleware.js";
import type { MatchingRunQuery } from "../../common/validators/matching-run.validators.js";
import * as matchingService from "./matching.service.js";
import * as queueService from "./matching-queue.service.js";

export async function triggerMatchingController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { applicationId, modelId } = req.body;
    const run = await matchingService.runMatching(applicationId, modelId);
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
    const { modelId } = req.body;
    const runs = await matchingService.runMatchingForJob(jobPostId, modelId);
    res.status(200).json({ success: true, data: runs });
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
    const state = await queueService.enqueueJobMatching(jobPostId, modelId);
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
    const state = await queueService.getMatchingJobStatus(queueJobId);
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
    const run = await matchingService.getMatchingRun(id);
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
    const result = await matchingService.getMatchingRuns(req.query as unknown as MatchingRunQuery);
    res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
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
    const score = await matchingService.getApplicationScore(applicationId);
    res.status(200).json({ success: true, data: score });
  } catch (error) {
    next(error);
  }
}
