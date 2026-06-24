import { rateLimit } from 'express-rate-limit';

const windowMs = 15 * 60 * 1000;

export const globalRateLimiter = rateLimit({
  windowMs,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

export const authRateLimiter = rateLimit({
  windowMs,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

export const uploadRateLimiter = rateLimit({
  windowMs,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many upload attempts. Please try again later.',
  },
});
