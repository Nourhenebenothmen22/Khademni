import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middlewares/auth.middleware.js";
import type { JobPostQuery } from "../../common/validators/job-post.validators.js";
import * as jobsService from "./jobs.service.js";

export async function createJobController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const createdById = req.user!.userId;
    const jobPost = await jobsService.createJobPost(createdById, req.body);
    res.status(201).json({
      success: true,
      data: jobPost,
    });
  } catch (error) {
    next(error);
  }
}

export async function getJobsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await jobsService.getJobPosts(
      req.query as unknown as JobPostQuery,
    );
    res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getJobByIdController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const jobPost = await jobsService.getJobPostById(id);
    res.status(200).json({
      success: true,
      data: jobPost,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateJobController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const updatedJob = await jobsService.updateJobPost(id, req.body);
    res.status(200).json({
      success: true,
      data: updatedJob,
    });
  } catch (error) {
    next(error);
  }
}
