import path from "node:path";
import crypto from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { applySecurityMiddleware } from "./common/middlewares/security.middleware.js";
import { verifyCsrf } from "./common/middlewares/csrf.middleware.js";
import {
  globalRateLimiter,
  uploadRateLimiter,
} from "./common/middlewares/rate-limit.middleware.js";
import { notFoundMiddleware } from "./common/middlewares/not-found.middleware.js";
import { globalErrorHandler } from "./common/middlewares/error.middleware.js";
import { authenticate } from "./common/middlewares/auth.middleware.js";
import { upload } from "./common/middlewares/upload.middleware.js";
import { openApiDocument } from "./config/swagger.js";
import { prisma } from "./lib/prisma.js";
import { env } from "./config/env.js";

import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { jobsRouter } from "./modules/jobs/jobs.routes.js";
import { applicationsRouter } from "./modules/applications/applications.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { matchingRouter } from "./modules/matching/matching.routes.js";
import { aiModelsRouter } from "./modules/ai-models/ai-models.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { applyToJobController } from "./modules/applications/applications.controller.js";

const app = express();

app.set("trust proxy", 1);

// X-Request-ID Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId =
    (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
});

applySecurityMiddleware(app);

// Serve static uploads directory securely
app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)));

// Enhanced Health Check with DB connectivity check
app.get("/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
});

app.get("/docs.json", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.send(openApiDocument);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use(globalRateLimiter);

// Double Submit Cookie CSRF Verification Middleware
app.use(verifyCsrf);

// API v1 Feature Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/jobs", jobsRouter);
app.use("/api/v1/applications", applicationsRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/matching", matchingRouter);
app.use("/api/v1/ai-models", aiModelsRouter);
app.use("/api/v1/notifications", notificationsRouter);

// Job Application Upload Route
app.post(
  "/api/v1/jobs/:jobId/apply",
  authenticate,
  uploadRateLimiter,
  upload.single("file"),
  applyToJobController,
);

app.use(notFoundMiddleware);
app.use(globalErrorHandler);

export { app };
