import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middlewares/auth.middleware.js";
import type { AIMatchingModelQuery } from "../../common/validators/ai-matching-model.validators.js";
import * as aiModelsService from "./ai-models.service.js";

export async function createModelController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const model = await aiModelsService.createModel(req.body);
    res.status(201).json({ success: true, data: model });
  } catch (error) {
    next(error);
  }
}

export async function getModelsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await aiModelsService.getModels(req.query as unknown as AIMatchingModelQuery);
    res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function getModelByIdController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const model = await aiModelsService.getModelById(id);
    res.status(200).json({ success: true, data: model });
  } catch (error) {
    next(error);
  }
}

export async function getActiveModelController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const model = await aiModelsService.getActiveModel();
    res.status(200).json({ success: true, data: model });
  } catch (error) {
    next(error);
  }
}

export async function updateModelController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const model = await aiModelsService.updateModel(id, req.body);
    res.status(200).json({ success: true, data: model });
  } catch (error) {
    next(error);
  }
}
