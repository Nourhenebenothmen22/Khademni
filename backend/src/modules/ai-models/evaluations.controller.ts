import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middlewares/auth.middleware.js";
import * as evaluationsService from "./evaluations.service.js";

export async function createEvaluationController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { modelId } = req.params as { modelId: string };
    const evaluation = await evaluationsService.createEvaluation(modelId, req.body);
    res.status(201).json({ success: true, data: evaluation });
  } catch (error) {
    next(error);
  }
}

export async function getEvaluationsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { modelId } = req.params as { modelId: string };
    const evaluations = await evaluationsService.getEvaluations(modelId);
    res.status(200).json({ success: true, data: evaluations });
  } catch (error) {
    next(error);
  }
}

export async function getEvaluationByIdController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { modelId, id } = req.params as { modelId: string; id: string };
    const evaluation = await evaluationsService.getEvaluationById(modelId, id);
    res.status(200).json({ success: true, data: evaluation });
  } catch (error) {
    next(error);
  }
}

export async function addMetricsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { modelId, id } = req.params as { modelId: string; id: string };
    const metrics = await evaluationsService.addMetrics(modelId, id, req.body);
    res.status(201).json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
}
