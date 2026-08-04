import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../common/middlewares/auth.middleware.js';
import * as rulesService from './job-matching-rules.service.js';

export async function addRuleController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { jobPostId } = req.params as { jobPostId: string };
    const rule = await rulesService.addRule(jobPostId, req.body);
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
}

export async function getRulesController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { jobPostId } = req.params as { jobPostId: string };
    const rules = await rulesService.getRules(jobPostId);
    res.status(200).json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
}

export async function updateRuleController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { jobPostId, id } = req.params as { jobPostId: string; id: string };
    const rule = await rulesService.updateRule(
      jobPostId,
      id,
      req.body,
    );
    res.status(200).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
}

export async function removeRuleController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { jobPostId, id } = req.params as { jobPostId: string; id: string };
    const result = await rulesService.removeRule(
      jobPostId,
      id,
    );
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}
