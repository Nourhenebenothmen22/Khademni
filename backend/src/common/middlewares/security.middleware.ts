import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";

export const applySecurityMiddleware = (app: Express): void => {
  app.disable("x-powered-by");

  app.use(helmet());

  const allowedOrigins = env.ALLOWED_CORS_ORIGINS;

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
          callback(null, true);
        } else {
          callback(new Error(`CORS error: Origin ${origin} not allowed by policy`));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID", "X-CSRF-Token"],
      exposedHeaders: ["X-Request-ID", "X-CSRF-Token"],
    }),
  );

  app.use(
    pinoHttp({
      logger,
      redact: {
        paths: ["req.headers.authorization", "req.headers.cookie", "req.headers['x-csrf-token']"],
        censor: "[REDACTED]",
      },
    }),
  );

  app.use(compression());

  app.use(cookieParser());

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
};
