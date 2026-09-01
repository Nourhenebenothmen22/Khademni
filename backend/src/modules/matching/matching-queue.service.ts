import { Queue, Worker, Job } from "bullmq";
import { nanoid } from "nanoid";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import { logger } from "../../lib/logger.js";
import { redisClient, getBullMqRedisOptions } from "../../lib/redis.js";
import { env } from "../../config/env.js";
import { realtimeEventBus } from "../../lib/realtime/event-bus.js";
import { runMatching } from "./matching.service.js";

export type MatchingJobStatusType = "pending" | "processing" | "completed" | "failed";

export interface MatchingJobState {
  queueJobId: string;
  jobPostId: string;
  organizationId?: string | null;
  modelId: string;
  status: MatchingJobStatusType;
  totalApplications: number;
  processedCount: number;
  failedCount: number;
  progressPercent: number;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

const matchingJobsStore = new Map<string, MatchingJobState>();
const JOB_KEY_PREFIX = "matching_job:";
const JOB_TTL_SECONDS = 86400; // 24 hours
const QUEUE_NAME = "matching-queue";

let matchingQueue: Queue | null = null;
let matchingWorker: Worker | null = null;

if (env.REDIS_URL) {
  try {
    const connection = getBullMqRedisOptions();
    matchingQueue = new Queue(QUEUE_NAME, { connection });

    matchingWorker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        const { queueJobId, applicationIds, modelId } = job.data;
        await processMatchingQueueJob(queueJobId, applicationIds, modelId);
      },
      { connection, concurrency: 2 },
    );

    matchingWorker.on("failed", (job, err) => {
      logger.error({ queueJobId: job?.data?.queueJobId, err: err.message }, "BullMQ matching worker job failed");
    });

    logger.info("BullMQ matching queue and worker initialized successfully.");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.warn({ err: message }, "Failed to initialize BullMQ, falling back to local processing.");
  }
}

async function saveJobState(state: MatchingJobState): Promise<void> {
  matchingJobsStore.set(state.queueJobId, state);
  if (redisClient) {
    try {
      await redisClient.setex(
        `${JOB_KEY_PREFIX}${state.queueJobId}`,
        JOB_TTL_SECONDS,
        JSON.stringify(state),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.warn({ err: message, queueJobId: state.queueJobId }, "Failed to persist job state to Redis.");
    }
  }

  if (state.organizationId) {
    realtimeEventBus.emitEvent({
      type: state.status === "completed" ? "MATCHING_RUN_COMPLETED" : "MATCHING_PROGRESS_UPDATED",
      data: state,
      organizationId: state.organizationId,
    });
  }
}

async function loadJobState(queueJobId: string): Promise<MatchingJobState | null> {
  if (redisClient) {
    try {
      const raw = await redisClient.get(`${JOB_KEY_PREFIX}${queueJobId}`);
      if (raw) {
        return JSON.parse(raw) as MatchingJobState;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.warn({ err: message, queueJobId }, "Failed to load job state from Redis, falling back to local map.");
    }
  }
  return matchingJobsStore.get(queueJobId) || null;
}

/**
 * Enqueues an asynchronous batch matching execution for all applications of a job post.
 * Uses BullMQ distributed queue if Redis is configured, or falls back to in-memory processing.
 */
export async function enqueueJobMatching(
  jobPostId: string,
  modelId?: string,
  organizationId?: string,
): Promise<MatchingJobState> {
  const job = await prisma.jobPost.findUnique({
    where: { id: jobPostId },
    include: {
      applications: { select: { id: true } },
    },
  });

  if (!job) {
    throw new AppError("Job post not found.", 404);
  }

  if (organizationId && job.organizationId !== organizationId) {
    throw new AppError("Job post not found or access denied.", 404);
  }

  if (env.NODE_ENV === "production" && !env.REDIS_URL) {
    throw new AppError(
      "Asynchronous background matching queue requires a configured Redis instance (REDIS_URL) in production environment.",
      503,
    );
  }

  let activeModelId = modelId;
  if (!activeModelId) {
    const activeModel = await prisma.aIMatchingModel.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    if (!activeModel) {
      throw new AppError("No active AI matching model found.", 400);
    }
    activeModelId = activeModel.id;
  }

  const queueJobId = `mq_${Date.now()}_${nanoid(6)}`;
  const initialState: MatchingJobState = {
    queueJobId,
    jobPostId,
    organizationId: job.organizationId,
    modelId: activeModelId,
    status: "pending",
    totalApplications: job.applications.length,
    processedCount: 0,
    failedCount: 0,
    progressPercent: 0,
    createdAt: new Date().toISOString(),
  };

  await saveJobState(initialState);

  const applicationIds = job.applications.map((a) => a.id);

  if (matchingQueue) {
    await matchingQueue.add("processMatching", {
      queueJobId,
      applicationIds,
      modelId: activeModelId,
    });
  } else {
    setImmediate(() => {
      processMatchingQueueJob(queueJobId, applicationIds, activeModelId as string).catch((error) => {
        logger.error({ error, queueJobId }, "Background matching worker failed");
      });
    });
  }

  logger.info(
    { queueJobId, jobPostId, totalApplications: initialState.totalApplications, mode: matchingQueue ? "BullMQ" : "local" },
    "Enqueued background AI matching job.",
  );

  return initialState;
}

/**
 * Background worker task that processes candidate applications in batch mode.
 */
async function processMatchingQueueJob(
  queueJobId: string,
  applicationIds: string[],
  modelId: string,
): Promise<void> {
  const state = await loadJobState(queueJobId);
  if (!state) return;

  state.status = "processing";
  state.startedAt = new Date().toISOString();
  await saveJobState(state);

  if (applicationIds.length === 0) {
    state.status = "completed";
    state.progressPercent = 100;
    state.finishedAt = new Date().toISOString();
    await saveJobState(state);
    return;
  }

  try {
    for (let i = 0; i < applicationIds.length; i++) {
      const appId = applicationIds[i];
      if (!appId) continue;
      try {
        await runMatching(appId, modelId, state.organizationId ?? undefined);
        state.processedCount++;
      } catch (error) {
        state.failedCount++;
        logger.error({ error, appId, queueJobId }, "Error processing matching run for application");
      }

      state.progressPercent = Math.round(((i + 1) / applicationIds.length) * 100);
      await saveJobState(state);
    }

    state.status = "completed";
    state.finishedAt = new Date().toISOString();
    await saveJobState(state);
    logger.info(
      { queueJobId, processedCount: state.processedCount, failedCount: state.failedCount },
      "Background AI matching job completed.",
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown matching execution failure";
    state.status = "failed";
    state.errorMessage = message;
    state.finishedAt = new Date().toISOString();
    await saveJobState(state);
  }
}

/**
 * Returns the real-time status and progress of an enqueued background matching job.
 */
export async function getMatchingJobStatus(
  queueJobId: string,
  requesterOrgId?: string,
): Promise<MatchingJobState> {
  const state = await loadJobState(queueJobId);
  if (!state) {
    throw new AppError("Matching queue job not found.", 404);
  }
  if (requesterOrgId && state.organizationId && state.organizationId !== requesterOrgId) {
    throw new AppError("Matching queue job not found or access denied.", 404);
  }
  return state;
}
