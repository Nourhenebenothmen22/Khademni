import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middlewares/auth.middleware.js";
import type { JobPostQuery } from "../../common/validators/job-post.validators.js";
import { AppError } from "../../common/errors/app-error.js";
import * as jobsService from "./jobs.service.js";

function getOrganizationId(req: AuthenticatedRequest): string {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    throw new AppError("Organization context is required for this operation", 403);
  }
  return orgId;
}

export async function createJobController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const createdById = req.user!.userId;
    const organizationId = getOrganizationId(req);
    const jobPost = await jobsService.createJobPost(createdById, req.body, organizationId);
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
    const query = (req as any).validatedQuery as JobPostQuery || (req.query as unknown as JobPostQuery);
    const result = await jobsService.getJobPosts(query);
    res.status(200).json({
      success: true,
      data: result.items,
      meta: result.pagination,
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
    const organizationId = getOrganizationId(req);
    const updatedJob = await jobsService.updateJobPost(id, req.body, organizationId);
    res.status(200).json({
      success: true,
      data: updatedJob,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteJobController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const organizationId = getOrganizationId(req);
    const result = await jobsService.deleteJobPost(id, organizationId);
    res.status(200).json({
      success: true,
      data: { message: result.message },
    });
  } catch (error) {
    next(error);
  }
}
