import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../common/middlewares/auth.middleware.js';
import * as jobKeywordsService from './job-keywords.service.js';

export async function addKeywordsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const keywords = await jobKeywordsService.addKeywords(
      req.params.jobPostId,
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
    const keywords = await jobKeywordsService.getKeywords(req.params.jobPostId);
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
    const keyword = await jobKeywordsService.updateKeyword(
      req.params.jobPostId,
      req.params.id,
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
    const result = await jobKeywordsService.removeKeyword(
      req.params.jobPostId,
      req.params.id,
    );
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}
