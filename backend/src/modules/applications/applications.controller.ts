import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middlewares/auth.middleware.js";
import type { ApplicationQuery, MyApplicationsQuery } from "../../common/validators/application.validators.js";
import { AppError } from "../../common/errors/app-error.js";
import * as applicationsService from "./applications.service.js";

function getOrganizationId(req: AuthenticatedRequest): string {
  const orgId = req.user?.organizationId;
  if (!orgId || req.user?.role !== "ORGANIZATION_ADMIN") {
    throw new AppError("Organization administrator context is required.", 403);
  }
  return orgId;
}

export async function applyToJobController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const candidateId = req.user!.userId;
    const { jobId } = req.params as { jobId: string };
    const { motivationLetter } = req.body || {};

    const application = await applicationsService.applyToJob(
      candidateId,
      jobId,
      motivationLetter,
      req.file,
    );

    res.status(201).json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadDocumentController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id, docId } = req.params as { id: string; docId: string };
    const userId = req.user!.userId;
    const role = req.user!.role;
    const organizationId = role === "ORGANIZATION_ADMIN" ? (req.user?.organizationId ?? undefined) : undefined;

    const { stream, document } = await applicationsService.getDownloadStream(
      id,
      docId,
      userId,
      role,
      organizationId,
    );

    res.setHeader("Content-Type", document.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(document.originalName)}"`,
    );

    stream.on("error", (err) => {
      next(new AppError("Failed to stream document file.", 500, err));
    });

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

export async function getApplicationsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const organizationId = getOrganizationId(req);
    const query = req.query as unknown as ApplicationQuery;
    const result = await applicationsService.getApplications(query, organizationId);

    res.status(200).json({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateApplicationStatusController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const changedById = req.user!.userId;
    const organizationId = getOrganizationId(req);

    const updated = await applicationsService.updateApplicationStatus(
      id,
      changedById,
      req.body,
      organizationId,
    );

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyApplicationsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const candidateId = req.user!.userId;
    const query = req.query as unknown as MyApplicationsQuery;
    const result = await applicationsService.getCandidateApplications(candidateId, query);

    res.status(200).json({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function withdrawApplicationController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user!.userId;
    const role = req.user!.role;
    const organizationId = role === "ORGANIZATION_ADMIN" ? (req.user?.organizationId ?? undefined) : undefined;

    const updated = await applicationsService.withdrawApplication(
      id,
      userId,
      role,
      organizationId,
    );

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteApplicationController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const userId = req.user!.userId;
    const organizationId = getOrganizationId(req);

    const result = await applicationsService.deleteApplication(
      id,
      organizationId,
      userId,
    );

    res.status(200).json({
      success: true,
      data: { message: result.message },
    });
  } catch (error) {
    next(error);
  }
}

