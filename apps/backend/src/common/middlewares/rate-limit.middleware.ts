import { rateLimit } from "express-rate-limit";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

const windowMs = 15 * 60 * 1000;

// Log distributed rate limit store status
if (env.REDIS_URL) {
  logger.info({ redisUrl: env.REDIS_URL }, "Distributed rate limiting configured with Redis URL.");
} else {
  logger.info("Local in-memory rate limiting active (REDIS_URL unconfigured).");
}

export const globalRateLimiter = rateLimit({
  windowMs,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
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
  message: {
    success: false,
    message: "Too many upload attempts. Please try again later.",
  },
});
