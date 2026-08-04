import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../common/middlewares/auth.middleware.js';
import * as jobKeywordsService from './job-keywords.service.js';

export async function addKeywordsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { jobPostId } = req.params as { jobPostId: string };
    const keywords = await jobKeywordsService.addKeywords(
      jobPostId,
      req.body.keywords,
    );
    res.status(201).json({ success: true, data: keywords });
  } catch (error) {
    next(error);
  }
}

export async function getKeywordsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { jobPostId } = req.params as { jobPostId: string };
    const keywords = await jobKeywordsService.getKeywords(jobPostId);
    res.status(200).json({ success: true, data: keywords });
  } catch (error) {
    next(error);
  }
}

export async function updateKeywordController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { jobPostId, id } = req.params as { jobPostId: string; id: string };
    const keyword = await jobKeywordsService.updateKeyword(
      jobPostId,
      id,
      req.body,
    );
    res.status(200).json({ success: true, data: keyword });
  } catch (error) {
    next(error);
  }
}

export async function removeKeywordController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { jobPostId, id } = req.params as { jobPostId: string; id: string };
    const result = await jobKeywordsService.removeKeyword(
      jobPostId,
      id,
    );
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}
