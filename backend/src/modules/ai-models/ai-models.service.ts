import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import {
  getCache,
  setCache,
  ACTIVE_AI_MODEL_CACHE_KEY,
  invalidateActiveModelCache,
} from "../../lib/cache.js";
import type { 
  CreateAIMatchingModelInput, 
  UpdateAIMatchingModelInput, 
  AIMatchingModelQuery 
} from "../../common/validators/ai-matching-model.validators.js";

export async function createModel(input: CreateAIMatchingModelInput) {
  if (input.isActive) {
    await prisma.aIMatchingModel.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    await invalidateActiveModelCache();
  }

  const model = await prisma.aIMatchingModel.create({
    data: {
      name: input.name,
      version: input.version,
      algorithm: input.algorithm,
      description: input.description,
      hyperparameters: input.hyperparameters as object,
      isActive: input.isActive ?? true,
    }
  });

  await invalidateActiveModelCache();
  return model;
}

export async function getModels(query: AIMatchingModelQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.aIMatchingModel.count({ where }),
    prisma.aIMatchingModel.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
    }),
  ]);

  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getModelById(id: string) {
  const model = await prisma.aIMatchingModel.findUnique({ where: { id } });
  if (!model) throw new AppError("Model not found", 404);
  return model;
}

export async function getActiveModel() {
  // Check Redis/memory cache first
  const cachedModel = await getCache<any>(ACTIVE_AI_MODEL_CACHE_KEY);
  if (cachedModel) {
    return cachedModel;
  }

  const model = await prisma.aIMatchingModel.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  if (!model) throw new AppError("No active model found", 404);

  // Cache active model for 1 hour (3600s)
  await setCache(ACTIVE_AI_MODEL_CACHE_KEY, model, 3600);
  return model;
}

export async function updateModel(id: string, input: UpdateAIMatchingModelInput) {
  const existing = await prisma.aIMatchingModel.findUnique({ where: { id } });
  if (!existing) throw new AppError("Model not found", 404);

  if (input.isActive) {
    await prisma.aIMatchingModel.updateMany({
      where: { id: { not: id }, isActive: true },
      data: { isActive: false },
    });
  }

  const model = await prisma.aIMatchingModel.update({
    where: { id },
    data: {
      name: input.name,
      version: input.version,
      algorithm: input.algorithm,
      description: input.description,
      hyperparameters: input.hyperparameters ? (input.hyperparameters as object) : undefined,
      isActive: input.isActive,
    }
  });

  // Automatically invalidate active model cache when model configuration changes
  await invalidateActiveModelCache();

  return model;
}
