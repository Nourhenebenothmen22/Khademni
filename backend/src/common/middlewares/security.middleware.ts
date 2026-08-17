import express, { type Express } from "express";
import helmet from "helmet";
import cors, { type CorsOptions } from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";

export const applySecurityMiddleware = (app: Express): void => {
  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    }),
  );

  const allowedOriginsSet = new Set(
    env.ALLOWED_CORS_ORIGINS.map((o) => o.trim().replace(/\/$/, "")),
  );

  const corsOptions: CorsOptions = {
    origin: (requestOrigin, callback) => {
      // Allow non-browser requests (mobile apps, curl, server-to-server, health checks) with no origin header
      if (!requestOrigin) {
        return callback(null, true);
      }

      const normalizedOrigin = requestOrigin.trim().replace(/\/$/, "");

      if (
        allowedOriginsSet.has("*") ||
        allowedOriginsSet.has(normalizedOrigin) ||
        allowedOriginsSet.has(requestOrigin)
      ) {
        return callback(null, true);
      }

      logger.warn(
        { origin: requestOrigin, allowedOrigins: Array.from(allowedOriginsSet) },
        "Request blocked by CORS policy: Origin not allowed",
      );
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "x-request-id",
      "X-CSRF-Token",
      "x-csrf-token",
      "X-Organization-Id",
      "x-organization-id",
      "X-Tenant-Id",
      "x-tenant-id",
      "Accept",
      "Origin",
      "X-Requested-With",
    ],
    exposedHeaders: [
      "X-Request-ID",
      "X-CSRF-Token",
      "x-csrf-token",
    ],
    optionsSuccessStatus: 200,
    maxAge: 86400,
  };

  app.use(cors(corsOptions));

  app.use(
    pinoHttp({
      logger,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.headers['x-csrf-token']",
        ],
        censor: "[REDACTED]",
      },
    }),
  );

  app.use(compression());

  app.use(cookieParser());

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
};
