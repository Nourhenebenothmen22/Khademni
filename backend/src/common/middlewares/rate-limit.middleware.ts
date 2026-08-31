import { rateLimit } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { redisClient } from "../../lib/redis.js";

const windowMs = 15 * 60 * 1000;

function getStore(prefix: string) {
  if (redisClient) {
    return new RedisStore({
      // @ts-expect-error rateLimit store handler type incompatibility
      sendCommand: (...args: string[]) => redisClient!.call(...args),
      prefix: `rl:${prefix}:`,
    });
  }
  return undefined;
}

// Log distributed rate limit store status
if (env.REDIS_URL && redisClient) {
  logger.info({ redisUrl: env.REDIS_URL }, "Distributed rate limiting active via Redis.");
} else {
  logger.info("Local in-memory rate limiting active (REDIS_URL unconfigured).");
}

const isTestEnv = env.NODE_ENV === "test" || process.env.VITEST !== undefined;

export const globalRateLimiter = rateLimit({
  windowMs,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  store: getStore("global"),
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

export const authRateLimiter = rateLimit({
  windowMs,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  store: getStore("auth"),
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

export const authLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  store: getStore("auth_login"),
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

export const authRegisterRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  store: getStore("auth_register"),
  message: {
    success: false,
    message:
      "Too many account registration attempts. Please try again after an hour.",
  },
});

export const authRefreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  store: getStore("auth_refresh"),
  message: {
    success: false,
    message: "Too many token refresh attempts. Please try again later.",
  },
});

export const authMfaRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  store: getStore("auth_mfa"),
  message: {
    success: false,
    message:
      "Too many MFA verification attempts. Please try again after 15 minutes.",
  },
});

export const uploadRateLimiter = rateLimit({
  windowMs,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  store: getStore("upload"),
  message: {
    success: false,
    message: "Too many upload attempts. Please try again later.",
  },
});

export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  store: getStore("webhook"),
  message: {
    success: false,
    message: "Too many webhook requests. Please try again later.",
  },
});

