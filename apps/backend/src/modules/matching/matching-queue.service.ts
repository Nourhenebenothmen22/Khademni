import { nanoid } from "nanoid";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import { logger } from "../../lib/logger.js";
import { runMatching } from "./matching.service.js";

export type MatchingJobStatusType = "pending" | "processing" | "completed" | "failed";

export interface MatchingJobState {
  queueJobId: string;
  jobPostId: string;
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

/**
 * Enqueues an asynchronous batch matching execution for all applications of a job post.
 * Returns immediately with a queue tracking ID.
 */
export async function enqueueJobMatching(
  jobPostId: string,
  modelId?: string,
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

  // Resolve model ID (or use active model)
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
    modelId: activeModelId,
    status: "pending",
    totalApplications: job.applications.length,
    processedCount: 0,
    failedCount: 0,
    progressPercent: 0,
    createdAt: new Date().toISOString(),
  };

  matchingJobsStore.set(queueJobId, initialState);

  // Trigger background processing asynchronously without blocking HTTP response
  setImmediate(() => {
    processMatchingQueueJob(queueJobId, job.applications.map((a) => a.id), activeModelId as string).catch(
      (error) => {
        logger.error({ error, queueJobId }, "Background matching worker failed");
      },
    );
  });

  logger.info(
    { queueJobId, jobPostId, totalApplications: initialState.totalApplications },
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
  const state = matchingJobsStore.get(queueJobId);
  if (!state) return;

  state.status = "processing";
  state.startedAt = new Date().toISOString();

  if (applicationIds.length === 0) {
    state.status = "completed";
    state.progressPercent = 100;
    state.finishedAt = new Date().toISOString();
    return;
  }

  try {
    for (let i = 0; i < applicationIds.length; i++) {
      const appId = applicationIds[i];
      try {
        await runMatching(appId as string, modelId);
        state.processedCount++;
      } catch (error) {
        state.failedCount++;
        logger.error({ error, appId, queueJobId }, "Error processing matching run for application");
      }

      state.progressPercent = Math.round(((i + 1) / applicationIds.length) * 100);
    }

    state.status = "completed";
    state.finishedAt = new Date().toISOString();
    logger.info(
      { queueJobId, processedCount: state.processedCount, failedCount: state.failedCount },
      "Background AI matching job completed.",
    );
  } catch (error: any) {
    state.status = "failed";
    state.errorMessage = error?.message || "Unknown matching execution failure";
    state.finishedAt = new Date().toISOString();
  }
}

/**
 * Returns the real-time status and progress of an enqueued background matching job.
 */
export async function getMatchingJobStatus(queueJobId: string): Promise<MatchingJobState> {
  const state = matchingJobsStore.get(queueJobId);
  if (!state) {
    throw new AppError("Matching queue job not found.", 404);
  }
  return state;
}
