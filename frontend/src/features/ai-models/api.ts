import { apiRequest } from "@/lib/api/client";
import { ApiResponse, AIMatchingModel, AIMatchingModelEvaluation, EvaluationMetricType } from "@/types/backend";

export interface AIModelQueryFilters {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateAIModelPayload {
  name: string;
  version: string;
  algorithm: string;
  description?: string;
  isActive?: boolean;
  hyperparameters?: Record<string, unknown>;
}

export interface CreateEvaluationPayload {
  datasetName: string;
  evaluationSampleSize: number;
  averageLatencyMs?: number;
  evaluationDetails?: Record<string, unknown>;
  evaluatedAt?: string;
}

export interface CreateMetricsPayload {
  metrics: Array<{
    type: EvaluationMetricType;
    value: number;
  }>;
}

export async function fetchAIModels(filters: AIModelQueryFilters = {}): Promise<ApiResponse<AIMatchingModel[]>> {
  const queryParams = new URLSearchParams();
  if (filters.page) queryParams.set("page", String(filters.page));
  if (filters.limit) queryParams.set("limit", String(filters.limit));
  if (filters.isActive !== undefined) queryParams.set("isActive", String(filters.isActive));
  if (filters.search) queryParams.set("search", filters.search);
  if (filters.sortBy) queryParams.set("sortBy", filters.sortBy);
  if (filters.sortOrder) queryParams.set("sortOrder", filters.sortOrder);

  const queryStr = queryParams.toString();
  return apiRequest<AIMatchingModel[]>(`/ai-models${queryStr ? `?${queryStr}` : ""}`);
}

export async function fetchActiveAIModel(): Promise<ApiResponse<AIMatchingModel>> {
  return apiRequest<AIMatchingModel>("/ai-models/active");
}

export async function fetchAIModelById(id: string): Promise<ApiResponse<AIMatchingModel>> {
  return apiRequest<AIMatchingModel>(`/ai-models/${id}`);
}

export async function createAIModel(payload: CreateAIModelPayload): Promise<ApiResponse<AIMatchingModel>> {
  return apiRequest<AIMatchingModel>("/ai-models", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAIModel(id: string, payload: Partial<CreateAIModelPayload>): Promise<ApiResponse<AIMatchingModel>> {
  return apiRequest<AIMatchingModel>(`/ai-models/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Evaluations & Metrics APIs
export async function fetchModelEvaluations(modelId: string): Promise<ApiResponse<AIMatchingModelEvaluation[]>> {
  return apiRequest<AIMatchingModelEvaluation[]>(`/ai-models/${modelId}/evaluations`);
}

export async function createModelEvaluation(modelId: string, payload: CreateEvaluationPayload): Promise<ApiResponse<AIMatchingModelEvaluation>> {
  return apiRequest<AIMatchingModelEvaluation>(`/ai-models/${modelId}/evaluations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchEvaluationById(modelId: string, evaluationId: string): Promise<ApiResponse<AIMatchingModelEvaluation>> {
  return apiRequest<AIMatchingModelEvaluation>(`/ai-models/${modelId}/evaluations/${evaluationId}`);
}

export async function addEvaluationMetrics(modelId: string, evaluationId: string, payload: CreateMetricsPayload): Promise<ApiResponse<{ count: number }>> {
  return apiRequest<{ count: number }>(`/ai-models/${modelId}/evaluations/${evaluationId}/metrics`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
