import { logger } from "./logger.js";
import { env } from "../config/env.js";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

/**
 * Clean up expired in-memory cache keys periodically.
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt < now) {
      memoryCache.delete(key);
    }
  }
}, 60 * 1000).unref();

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const entry = memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }

    logger.debug({ key }, "Cache hit");
    return entry.value as T;
  } catch (error) {
    logger.error({ error, key }, "Error fetching from cache");
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds = 3600, // Default 1 hour TTL
): Promise<void> {
  try {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    memoryCache.set(key, { value, expiresAt });
    logger.debug({ key, ttlSeconds }, "Cache set");
  } catch (error) {
    logger.error({ error, key }, "Error writing to cache");
  }
}

export async function delCache(key: string): Promise<void> {
  try {
    memoryCache.delete(key);
    logger.debug({ key }, "Cache key invalidated");
  } catch (error) {
    logger.error({ error, key }, "Error deleting cache key");
  }
}

export const ACTIVE_AI_MODEL_CACHE_KEY = "ai_models:active_model";

export async function invalidateActiveModelCache(): Promise<void> {
  await delCache(ACTIVE_AI_MODEL_CACHE_KEY);
  logger.info("Active AI matching model cache invalidated.");
}

export const PUBLISHED_JOBS_CACHE_KEY = "jobs:published_list";

export async function invalidateJobCache(jobId?: string): Promise<void> {
  await delCache(PUBLISHED_JOBS_CACHE_KEY);
  if (jobId) {
    await delCache(`jobs:detail:${jobId}`);
  }
  logger.info({ jobId }, "Job cache invalidated.");
}
