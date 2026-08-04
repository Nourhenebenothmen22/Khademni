import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

let redisClient: Redis | null = null;

if (env.REDIS_URL) {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      lazyConnect: true,
    });

    redisClient.on("connect", () => {
      logger.info("Connected to Redis server.");
    });

    redisClient.on("error", (err) => {
      logger.warn({ err: err.message }, "Redis connection warning.");
    });

    redisClient.connect().catch((err) => {
      logger.warn({ err: err?.message }, "Initial Redis connection attempt failed; fallback active.");
    });
  } catch (error) {
    logger.error({ error }, "Failed to initialize Redis client.");
  }
} else {
  logger.info("REDIS_URL is unconfigured. In-memory fallback stores will be active.");
}

export { redisClient };
