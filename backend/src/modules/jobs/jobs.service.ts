import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import { logAuditAction } from "../../lib/audit.js";
import {
  getCache,
  setCache,
  PUBLISHED_JOBS_CACHE_KEY,
  invalidateJobCache,
} from "../../lib/cache.js";
import type {
  CreateJobPostInput,
  UpdateJobPostInput,
  JobPostQuery,
} from "../../common/validators/job-post.validators.js";
import type { JobStatus } from "../../generated/prisma/client.js";

export async function createJobPost(
  createdById: string,
  input: CreateJobPostInput,
  organizationId: string,
) {
  const status: JobStatus = (input.status as JobStatus) || "DRAFT";
  const publishedAt = status === "PUBLISHED" ? new Date() : null;

  const jobPost = await prisma.jobPost.create({
    data: {
      title: input.title,
      description: input.description,
      requirements: input.requirements,
      status,
      deadline: input.deadline,
      publishedAt,
      createdById,
      organizationId,
    },
    include: {
      keywords: true,
      matchingRules: true,
    },
  });

  await invalidateJobCache();

  logAuditAction({
    userId: createdById,
    organizationId,
    action: "JOB_POST_CREATED",
    entityType: "JobPost",
    entityId: jobPost.id,
    metadata: { title: jobPost.title, status: jobPost.status },
  });

  return jobPost;
}

export async function getJobPosts(query: JobPostQuery) {
  const isDefaultPublishedList =
    query.status === "PUBLISHED" &&
    !query.search &&
    !query.createdById &&
    (!query.page || query.page === 1);

  if (isDefaultPublishedList) {
    const cachedList = await getCache<any>(PUBLISHED_JOBS_CACHE_KEY);
    if (cachedList) return cachedList;
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereClause: Prisma.JobPostWhereInput = {};

  if (query.status) {
    whereClause.status = query.status;
  }

  if (query.createdById) {
    whereClause.createdById = query.createdById;
  }

  if (query.search) {
    whereClause.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { requirements: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.jobPost.count({ where: whereClause }),
    prisma.jobPost.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        [query.sortBy || "createdAt"]: query.sortOrder || "desc",
      },
      include: {
        keywords: true,
        matchingRules: true,
        _count: {
          select: { applications: true },
        },
      },
    }),
  ]);

  const result = {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };

  if (isDefaultPublishedList) {
    await setCache(PUBLISHED_JOBS_CACHE_KEY, result, 3600);
  }

  return result;
}

export async function getJobPostById(id: string) {
  const cacheKey = `jobs:detail:${id}`;
  const cachedJob = await getCache<any>(cacheKey);
  if (cachedJob) return cachedJob;

  const jobPost = await prisma.jobPost.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      keywords: true,
      matchingRules: true,
      _count: {
        select: { applications: true },
      },
    },
  });

  if (!jobPost) {
    throw new AppError("Job post not found.", 404);
  }

  await setCache(cacheKey, jobPost, 3600);
  return jobPost;
}

export async function updateJobPost(
  id: string,
  input: UpdateJobPostInput,
  organizationId: string,
) {
  const existingJob = await prisma.jobPost.findFirst({
    where: { id, organizationId },
  });

  if (!existingJob) {
    throw new AppError("Job post not found or access denied.", 404);
  }

  const updateData: Prisma.JobPostUpdateInput = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.requirements !== undefined) updateData.requirements = input.requirements;
  if (input.deadline !== undefined) updateData.deadline = input.deadline;

  if (input.status !== undefined && input.status !== existingJob.status) {
    const newStatus = input.status as JobStatus;
    updateData.status = newStatus;

    if (newStatus === "PUBLISHED" && !existingJob.publishedAt) {
      updateData.publishedAt = new Date();
    } else if (newStatus === "CLOSED" && !existingJob.closedAt) {
      updateData.closedAt = new Date();
    }
  }

  const updatedJob = await prisma.jobPost.update({
    where: { id },
    data: updateData,
    include: {
      keywords: true,
      matchingRules: true,
    },
  });

  await invalidateJobCache(id);

  logAuditAction({
    userId: existingJob.createdById,
    organizationId,
    action: "JOB_POST_UPDATED",
    entityType: "JobPost",
    entityId: id,
    metadata: { updatedFields: Object.keys(input) },
  });

  return updatedJob;
}

export async function deleteJobPost(id: string, organizationId: string) {
  const existingJob = await prisma.jobPost.findFirst({
    where: { id, organizationId },
  });

  if (!existingJob) {
    throw new AppError("Job post not found or access denied.", 404);
  }

  await prisma.jobPost.delete({
    where: { id },
  });

  await invalidateJobCache(id);

  logAuditAction({
    userId: existingJob.createdById,
    organizationId,
    action: "JOB_POST_DELETED",
    entityType: "JobPost",
    entityId: id,
    metadata: { title: existingJob.title },
  });

  return { message: "Job post deleted successfully." };
}
