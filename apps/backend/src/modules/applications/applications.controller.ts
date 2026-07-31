import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middlewares/auth.middleware.js";
import type { ApplicationQuery } from "../../common/validators/application.validators.js";
import { getFileStream, fileExists } from "../../lib/file-storage.js";
import { AppError } from "../../common/errors/app-error.js";
import * as applicationsService from "./applications.service.js";

export async function applyToJobController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const candidateId = req.user!.userId;
    const { jobId } = req.params as { jobId: string };
    const { motivationLetter } = (req.body || {}) as {
      motivationLetter?: string;
    };
    const file = req.file;

    const application = await applicationsService.applyToJob(
      candidateId,
      jobId,
      motivationLetter,
      file,
    );

    res.status(201).json({
      success: true,
      data: application,
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
    const applications =
      await applicationsService.getCandidateApplications(candidateId);
    res.status(200).json({
      success: true,
      data: applications,
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
    const requestingUserId = req.user!.userId;
    const requestingRole = req.user!.role;
    const { id, docId } = req.params as { id: string; docId: string };

    const doc = await applicationsService.getApplicationDocumentDownload(
      id,
      docId,
      requestingUserId,
      requestingRole,
    );

    const exists = await fileExists(doc.storageKey);
    if (!exists) {
      throw new AppError("Document file not found on disk.", 404);
    }

    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(doc.originalName)}"`,
    );

    const stream = getFileStream(doc.storageKey);
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
    const result = await applicationsService.getApplications(
      req.query as unknown as ApplicationQuery,
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

export async function updateApplicationStatusController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const changedById = req.user!.userId;
    const { id } = req.params as { id: string };

    const updatedApplication =
      await applicationsService.updateApplicationStatus(
        id,
        changedById,
        req.body,
      );

    res.status(200).json({
      success: true,
      data: updatedApplication,
    });
  } catch (error) {
    next(error);
  }
}
