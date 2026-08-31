import { Redis, type RedisOptions } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

/**
 * Parses and returns normalized Redis connection options supporting both
 * local development instances and remote managed TLS clusters (e.g. Upstash, Redis Cloud).
 */
export function getRedisOptions(customOverrides?: Partial<RedisOptions>): RedisOptions {
  const isTls = env.REDIS_URL?.startsWith("rediss://");
  const hasEmbeddedAuth = env.REDIS_URL?.includes("@");

  const options: RedisOptions = {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    keepAlive: 10000,
    lazyConnect: true,
    retryStrategy(times) {
      const delay = Math.min(times * 150, 3000);
      return delay;
    },
    ...customOverrides,
  };

  // Only append password if not already embedded in connection URL
  if (!hasEmbeddedAuth && env.REDIS_PASSWORD) {
    options.password = env.REDIS_PASSWORD;
  }

  if (isTls && !options.tls) {
    options.tls = {
      rejectUnauthorized: true,
    };
  }

  return options;
}

/**
 * Returns connection options optimized specifically for BullMQ queues and workers.
 * BullMQ requires maxRetriesPerRequest: null for blocking commands.
 */
export function getBullMqRedisOptions(): RedisOptions & { url?: string } {
  const baseOptions = getRedisOptions({ maxRetriesPerRequest: null });
  return {
    ...baseOptions,
    url: env.REDIS_URL,
  };
}

let redisClient: Redis | null = null;

if (env.REDIS_URL) {
  try {
    redisClient = new Redis(env.REDIS_URL, getRedisOptions());

    redisClient.on("connect", () => {
      logger.info(
        { tls: env.REDIS_URL?.startsWith("rediss://") },
        "Connected to Redis server.",
      );
    });

    redisClient.on("error", (err) => {
      logger.warn({ err: err.message }, "Redis connection warning.");
    });

    redisClient.connect().catch((err) => {
      logger.warn(
        { err: err?.message },
        "Initial Redis connection attempt failed; fallback active.",
      );
    });
  } catch (error) {
    logger.error({ error }, "Failed to initialize Redis client.");
  }
} else {
  logger.info("REDIS_URL is unconfigured. In-memory fallback stores will be active.");
}

export { redisClient };
