import fs from "node:fs/promises";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import { saveFile, getFileStream, deleteFile } from "../../lib/file-storage.js";
import { sendApplicationStatusEmail } from "../../lib/email.js";
import { createNotification } from "../notifications/notifications.service.js";
import { realtimeEventBus } from "../../lib/realtime/event-bus.js";
import { logAuditAction } from "../../lib/audit.js";
import { isValidTransition } from "./status-machine.js";
import { PAGINATION_CONFIG } from "../../config/constants.js";
import type {
  UpdateApplicationStatusInput,
  ApplicationQuery,
  MyApplicationsQuery,
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

  let fileBuffer: Buffer;
  if (file.buffer) {
    fileBuffer = file.buffer;
  } else if (file.path) {
    fileBuffer = await fs.readFile(file.path);
  } else {
    throw new AppError("Invalid document file input.", 400);
  }

  const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const trackingCode = `APP-${nanoid(8).toUpperCase()}`;
  const storedName = `${Date.now()}-${nanoid(6)}_${file.originalname}`;
  const storageKey = `cvs/${candidateId}/${storedName}`;

  await saveFile(fileBuffer, storageKey);

  if (file.path) {
    fs.unlink(file.path).catch(() => {});
  }

  try {
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

      await tx.applicationDocument.create({
        data: {
          applicationId: newApp.id,
          type: "CV",
          status: "UPLOADED",
          originalName: file.originalname,
          storedName,
          storageKey,
          mimeType: file.mimetype,
          extension: file.originalname.split(".").pop() || "pdf",
          sizeBytes: file.size,
          sha256,
        },
      });

      return tx.application.findUnique({
        where: { id: newApp.id },
        include: { documents: true },
      });
    }, { timeout: 20000, maxWait: 10000 });

    logAuditAction({
      userId: candidateId,
      organizationId: jobPost.organizationId ?? undefined,
      action: "APPLICATION_SUBMITTED",
      entityType: "Application",
      entityId: application!.id,
      metadata: { trackingCode, jobPostId },
    });

    if (jobPost.organizationId) {
      realtimeEventBus.emitEvent({
        type: "APPLICATION_CREATED",
        data: {
          id: application!.id,
          trackingCode: application!.trackingCode,
          status: application!.status,
          candidateId,
          jobPostId,
          jobTitle: jobPost.title,
        },
        organizationId: jobPost.organizationId,
      });
    }

    return application!;

  } catch (error) {
    await deleteFile(storageKey).catch(() => {});
    throw error;
  }
}

export async function getDownloadStream(
  applicationId: string,
  docId: string,
  userId: string,
  role: string,
  organizationId?: string,
) {
  if (role === "ORGANIZATION_ADMIN" && !organizationId) {
    throw new AppError("Organization context is required for admin access.", 403);
  }

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      ...(role === "ORGANIZATION_ADMIN" && organizationId ? { jobPost: { organizationId } } : {}),
      ...(role === "CANDIDATE" ? { candidateId: userId } : {}),
    },
  });

  if (!application) {
    throw new AppError("Application not found or access denied.", 404);
  }

  const doc = await prisma.applicationDocument.findFirst({
    where: { id: docId, applicationId },
  });

  if (!doc) {
    throw new AppError("Document not found.", 404);
  }

  const stream = getFileStream(doc.storageKey);
  return { stream, document: doc };
}

export async function updateApplicationStatus(
  applicationId: string,
  changedById: string,
  input: UpdateApplicationStatusInput,
  organizationId?: string,
) {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      ...(organizationId ? { jobPost: { organizationId } } : {}),
    },
    include: {
      candidate: { select: { id: true, fullName: true, email: true } },
      jobPost: {
        select: {
          id: true,
          title: true,
          organizationId: true,
          organization: { select: { name: true } },
        },
      },
    },
  });

  if (!application) {
    throw new AppError("Application not found or access denied.", 404);
  }

  const oldStatus = application.status;
  const newStatus = input.status as ApplicationStatus;

  if (oldStatus === newStatus) {
    return application;
  }

  if (!isValidTransition(oldStatus, newStatus)) {
    throw new AppError(
      `Invalid status transition from ${oldStatus} to ${newStatus}.`,
      400,
    );
  }

  const [updatedApplication] = await prisma.$transaction([
    prisma.application.update({
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
            organizationId: true,
            organization: { select: { name: true } },
          },
        },
      },
    }),
    prisma.applicationStatusHistory.create({
      data: {
        applicationId,
        oldStatus,
        newStatus,
        changedById,
        reason: input.reason,
      },
    }),
  ]);

  sendApplicationStatusEmail(
    updatedApplication.candidate.email,
    updatedApplication.candidate.fullName,
    updatedApplication.trackingCode,
    updatedApplication.jobPost.title,
    newStatus,
    updatedApplication.jobPost.organization?.name,
    input.reason,
  );

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

  logAuditAction({
    userId: changedById,
    organizationId: organizationId || application.jobPost.organizationId || undefined,
    action: "APPLICATION_STATUS_UPDATED",
    entityType: "Application",
    entityId: applicationId,
    metadata: { oldStatus, newStatus, reason: input.reason },
  });

  realtimeEventBus.emitEvent({
    type: "APPLICATION_STATUS_UPDATED",
    data: {
      applicationId: updatedApplication.id,
      trackingCode: updatedApplication.trackingCode,
      status: updatedApplication.status,
      oldStatus,
      candidateId: updatedApplication.candidate.id,
      jobPostId: updatedApplication.jobPost.id,
      jobTitle: updatedApplication.jobPost.title,
    },
    userId: updatedApplication.candidate.id,
    organizationId: updatedApplication.jobPost.organizationId,
  });

  return updatedApplication;
}

export async function getApplications(
  query: ApplicationQuery,
  organizationId?: string,
) {
  const page = query.page ?? PAGINATION_CONFIG.DEFAULT_PAGE;
  const limit = query.limit ?? PAGINATION_CONFIG.DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  const whereClause: Prisma.ApplicationWhereInput = {};

  if (organizationId) {
    whereClause.jobPost = { organizationId };
  }

  if (query.status) {
    whereClause.status = query.status;
  }
  if (query.candidateId) {
    whereClause.candidateId = query.candidateId;
  }
  if (query.jobPostId) {
    whereClause.jobPostId = query.jobPostId;
  }

  if (query.search) {
    whereClause.OR = [
      { candidate: { fullName: { contains: query.search, mode: "insensitive" } } },
      { candidate: { email: { contains: query.search, mode: "insensitive" } } },
      { jobPost: { title: { contains: query.search, mode: "insensitive" } } },
      { trackingCode: { contains: query.search, mode: "insensitive" } },
    ];
  }

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
          select: { id: true, title: true, status: true, organizationId: true },
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

export async function getCandidateApplications(
  candidateId: string,
  query: Partial<MyApplicationsQuery> = {},
) {
  const page = Math.max(
    PAGINATION_CONFIG.DEFAULT_PAGE,
    Number(query.page) || PAGINATION_CONFIG.DEFAULT_PAGE,
  );
  const limit = Math.min(
    PAGINATION_CONFIG.MAX_LIMIT,
    Math.max(1, Number(query.limit) || PAGINATION_CONFIG.DEFAULT_LIMIT),
  );
  const skip = (page - 1) * limit;

  const where: Prisma.ApplicationWhereInput = {
    candidateId,
    ...(query.status ? { status: query.status } : {}),
  };

  const orderBy = {
    [query.sortBy || "createdAt"]: query.sortOrder || "desc",
  };

  const [items, total] = await Promise.all([
    prisma.application.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        jobPost: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        documents: true,
        score: true,
      },
    }),
    prisma.application.count({ where }),
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

export async function withdrawApplication(
  applicationId: string,
  userId: string,
  role: string,
  organizationId?: string,
) {
  if (role === "ORGANIZATION_ADMIN" && !organizationId) {
    throw new AppError("Organization context is required for admin access.", 403);
  }

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      ...(role === "ORGANIZATION_ADMIN" ? { jobPost: { organizationId } } : {}),
      ...(role === "CANDIDATE" ? { candidateId: userId } : {}),
    },
    include: {
      candidate: { select: { id: true, fullName: true, email: true } },
      jobPost: { select: { id: true, title: true, organizationId: true } },
    },
  });

  if (!application) {
    throw new AppError("Application not found or access denied.", 404);
  }

  const oldStatus = application.status;
  const newStatus: ApplicationStatus = "WITHDRAWN";

  if (oldStatus === newStatus) {
    throw new AppError("Application is already withdrawn.", 400);
  }

  if (!isValidTransition(oldStatus, newStatus)) {
    throw new AppError(
      `Cannot withdraw application from current status ${oldStatus}.`,
      400,
    );
  }

  const [updatedApplication] = await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: { status: newStatus },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        jobPost: { select: { id: true, title: true } },
      },
    }),
    prisma.applicationStatusHistory.create({
      data: {
        applicationId,
        oldStatus,
        newStatus,
        changedById: userId,
        reason: "Withdrawn by user",
      },
    }),
  ]);

  logAuditAction({
    userId,
    organizationId: application.jobPost.organizationId ?? undefined,
    action: "APPLICATION_WITHDRAWN",
    entityType: "Application",
    entityId: applicationId,
    metadata: { oldStatus, newStatus },
  });

  return updatedApplication;
}

export async function deleteApplication(
  applicationId: string,
  organizationId: string | undefined,
  userId: string,
) {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      ...(organizationId ? { jobPost: { organizationId } } : {}),
    },
    include: {
      documents: true,
    },
  });

  if (!application) {
    throw new AppError("Application not found or access denied.", 404);
  }

  for (const doc of application.documents) {
    await deleteFile(doc.storageKey).catch(() => {});
  }

  await prisma.application.delete({
    where: { id: applicationId },
  });

  logAuditAction({
    userId,
    organizationId,
    action: "APPLICATION_DELETED",
    entityType: "Application",
    entityId: applicationId,
    metadata: { trackingCode: application.trackingCode, jobPostId: application.jobPostId },
  });

  return { message: "Application deleted successfully." };
}

