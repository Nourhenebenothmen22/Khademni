import { logger } from "./logger.js";
import { env } from "../config/env.js";
import { redisClient } from "./redis.js";

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
  if (redisClient) {
    try {
      const raw = await redisClient.get(key);
      if (raw) {
        logger.debug({ key, store: "redis" }, "Cache hit");
        return JSON.parse(raw) as T;
      }
      return null;
    } catch (error) {
      logger.warn({ error, key }, "Redis getCache error; falling back to memoryCache");
    }
  }

  try {
    const entry = memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }

    logger.debug({ key, store: "memory" }, "Cache hit");
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
  if (redisClient) {
    try {
      await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
      logger.debug({ key, ttlSeconds, store: "redis" }, "Cache set");
      return;
    } catch (error) {
      logger.warn({ error, key }, "Redis setCache error; falling back to memoryCache");
    }
  }

  try {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    memoryCache.set(key, { value, expiresAt });
    logger.debug({ key, ttlSeconds, store: "memory" }, "Cache set");
  } catch (error) {
    logger.error({ error, key }, "Error writing to cache");
  }
}

export async function delCache(key: string): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.del(key);
      memoryCache.delete(key);
      logger.debug({ key, store: "redis" }, "Cache key invalidated");
      return;
    } catch (error) {
      logger.warn({ error, key }, "Redis delCache error; falling back to memoryCache");
    }
  }

  try {
    memoryCache.delete(key);
    logger.debug({ key, store: "memory" }, "Cache key invalidated");
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

