import fs from "node:fs/promises";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import { saveFile } from "../../lib/file-storage.js";
import { sendApplicationStatusEmail } from "../../lib/email.js";
import { createNotification } from "../notifications/notifications.service.js";
import { logAuditAction } from "../../lib/audit.js";
import { isValidTransition } from "./status-machine.js";
import type {
  UpdateApplicationStatusInput,
  ApplicationQuery,
} from "../../common/validators/application.validators.js";
import type { ApplicationStatus } from "../../generated/prisma/client.js";

export async function applyToJob(
  candidateId: string,
  jobPostId: string,
  motivationLetter?: string,
  file?: Express.Multer.File,
) {
  if (!file) {
    throw new AppError("Candidate CV document file is required.", 400);
  }

  const jobPost = await prisma.jobPost.findUnique({
    where: { id: jobPostId },
  });

  if (!jobPost) {
    throw new AppError("Job post not found.", 404);
  }

  if (jobPost.status !== "PUBLISHED") {
    throw new AppError("Job post is not currently open for applications.", 400);
  }

  const existingApplication = await prisma.application.findUnique({
    where: {
      candidateId_jobPostId: {
        candidateId,
        jobPostId,
      },
    },
  });

  if (existingApplication) {
    throw new AppError(
      "You have already submitted an application for this job.",
      409,
    );
  }

  // Support both disk-streamed file path and memory buffer
  let fileBuffer: Buffer;
  if (file.buffer) {
    fileBuffer = file.buffer;
  } else if (file.path) {
    fileBuffer = await fs.readFile(file.path);
  } else {
    throw new AppError("Invalid document file input.", 400);
  }

  // Calculate SHA256 checksum for document deduplication & integrity audit
  const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const trackingCode = `APP-${nanoid(8).toUpperCase()}`;

  const storedName = `${Date.now()}-${nanoid(6)}_${file.originalname}`;
  const storageKey = `cvs/${candidateId}/${storedName}`;

  // Persist file buffer to local disk storage
  await saveFile(fileBuffer, storageKey);

  // Clean up temporary disk upload file asynchronously if path was used
  if (file.path) {
    fs.unlink(file.path).catch(() => {});
  }

  // Execute database transaction for Application + Document insertion
  const application = await prisma.$transaction(async (tx) => {
    const newApp = await tx.application.create({
      data: {
        candidateId,
        jobPostId,
        motivationLetter,
        status: "SUBMITTED",
        trackingCode,
      },
    });

    const doc = await tx.applicationDocument.create({
      data: {
        applicationId: newApp.id,
        type: "CV",
        status: "UPLOADED",
        originalName: file.originalname,
        storedName,
        storageKey,
        mimeType: file.mimetype,
        extension: file.originalname.split(".").pop() || "",
        sizeBytes: file.size,
        sha256,
      },
    });

    return {
      ...newApp,
      documents: [doc],
    };
  });

  logAuditAction({
    userId: candidateId,
    action: "APPLICATION_SUBMITTED",
    entityType: "Application",
    entityId: application.id,
    metadata: { jobPostId, trackingCode },
  });

  return application;
}

export async function getCandidateApplications(candidateId: string) {
  const applications = await prisma.application.findMany({
    where: { candidateId },
    include: {
      jobPost: {
        select: {
          id: true,
          title: true,
          status: true,
          deadline: true,
        },
      },
      documents: {
        select: {
          id: true,
          type: true,
          status: true,
          originalName: true,
          sizeBytes: true,
          uploadedAt: true,
        },
      },
      score: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return applications;
}

export async function getApplicationDocumentDownload(
  applicationId: string,
  docId: string,
  requestingUserId: string,
  requestingRole: string,
) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    throw new AppError("Application not found.", 404);
  }

  if (
    requestingRole !== "ADMIN" &&
    application.candidateId !== requestingUserId
  ) {
    throw new AppError(
      "Forbidden. You do not have permission to access this document.",
      403,
    );
  }

  const document = await prisma.applicationDocument.findFirst({
    where: {
      id: docId,
      applicationId,
    },
  });

  if (!document) {
    throw new AppError("Document not found.", 404);
  }

  return document;
}

export async function updateApplicationStatus(
  applicationId: string,
  changedById: string,
  input: UpdateApplicationStatusInput,
) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      candidate: { select: { id: true, fullName: true, email: true } },
      jobPost: { select: { id: true, title: true } },
    },
  });

  if (!application) {
    throw new AppError("Application not found.", 404);
  }

  const oldStatus = application.status;
  const newStatus = input.status as ApplicationStatus;

  if (oldStatus === newStatus) {
    return application;
  }

  // Validate state machine status transition
  if (!isValidTransition(oldStatus, newStatus)) {
    throw new AppError(
      `Invalid status transition from ${oldStatus} to ${newStatus}.`,
      400,
    );
  }

  const updatedApplication = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: applicationId },
      data: { status: newStatus },
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        jobPost: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    await tx.applicationStatusHistory.create({
      data: {
        applicationId,
        oldStatus,
        newStatus,
        changedById,
        reason: input.reason,
      },
    });

    return updated;
  });

  // Send email notification to candidate (fire-and-forget)
  sendApplicationStatusEmail(
    updatedApplication.candidate.email,
    updatedApplication.candidate.fullName,
    updatedApplication.trackingCode,
    updatedApplication.jobPost.title,
    newStatus,
    input.reason,
  );

  // Send in-app notification
  createNotification({
    userId: updatedApplication.candidate.id,
    title: `Application Update: ${newStatus}`,
    message: `Your application ${updatedApplication.trackingCode} for "${updatedApplication.jobPost.title}" is now ${newStatus}.`,
    type: "APPLICATION_STATUS",
    metadata: {
      applicationId,
      trackingCode: updatedApplication.trackingCode,
      newStatus,
      reason: input.reason,
    },
  });

  // Log audit action
  logAuditAction({
    userId: changedById,
    action: "APPLICATION_STATUS_UPDATED",
    entityType: "Application",
    entityId: applicationId,
    metadata: { oldStatus, newStatus, reason: input.reason },
  });

  return updatedApplication;
}

export async function getApplications(query: ApplicationQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = {};

  if (query.status) whereClause.status = query.status;
  if (query.candidateId) whereClause.candidateId = query.candidateId;
  if (query.jobPostId) whereClause.jobPostId = query.jobPostId;

  const [total, items] = await Promise.all([
    prisma.application.count({ where: whereClause }),
    prisma.application.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [query.sortBy || "createdAt"]: query.sortOrder || "desc" },
      include: {
        candidate: {
          select: { id: true, fullName: true, email: true },
        },
        jobPost: {
          select: { id: true, title: true, status: true },
        },
        documents: true,
        score: true,
      },
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
