import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import type { CreateEvaluationInput } from "../../common/validators/ai-matching-evaluation.validators.js";
import type { BulkCreateMetricsInput } from "../../common/validators/ai-matching-metric.validators.js";

export async function createEvaluation(
  modelId: string,
  input: Omit<CreateEvaluationInput, "modelId">,
) {
  const model = await prisma.aIMatchingModel.findUnique({
    where: { id: modelId },
  });
  if (!model) throw new AppError("AI Matching Model not found.", 404);

  const evaluation = await prisma.aIMatchingModelEvaluation.create({
    data: {
      modelId,
      datasetName: input.datasetName,
      evaluationSampleSize: input.evaluationSampleSize,
      averageLatencyMs: input.averageLatencyMs,
      evaluationDetails: input.evaluationDetails as any,
      evaluatedAt: input.evaluatedAt || new Date(),
    },
  });

  return evaluation;
}

export async function getEvaluations(modelId: string) {
  const model = await prisma.aIMatchingModel.findUnique({
    where: { id: modelId },
  });
  if (!model) throw new AppError("AI Matching Model not found.", 404);

  return prisma.aIMatchingModelEvaluation.findMany({
    where: { modelId },
    include: { metrics: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEvaluationById(modelId: string, evaluationId: string) {
  const evaluation = await prisma.aIMatchingModelEvaluation.findFirst({
    where: { id: evaluationId, modelId },
    include: { metrics: true, model: true },
  });

  if (!evaluation) throw new AppError("Model evaluation not found.", 404);
  return evaluation;
}

export async function addMetrics(
  modelId: string,
  evaluationId: string,
  input: BulkCreateMetricsInput,
) {
  const evaluation = await prisma.aIMatchingModelEvaluation.findFirst({
    where: { id: evaluationId, modelId },
  });
  if (!evaluation) throw new AppError("Model evaluation not found.", 404);

  await prisma.aIMatchingMetric.createMany({
    data: input.metrics.map((m) => ({
      evaluationId,
      type: m.type as any,
      value: m.value,
    })),
    skipDuplicates: true,
  });

  return prisma.aIMatchingMetric.findMany({
    where: { evaluationId },
    orderBy: { createdAt: "asc" },
  });
}
