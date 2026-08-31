import "./config/zod-openapi.js";
import crypto from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { applySecurityMiddleware } from "./common/middlewares/security.middleware.js";
import { verifyCsrf } from "./common/middlewares/csrf.middleware.js";
import { globalRateLimiter } from "./common/middlewares/rate-limit.middleware.js";
import { notFoundMiddleware } from "./common/middlewares/not-found.middleware.js";
import { globalErrorHandler } from "./common/middlewares/error.middleware.js";

import { openApiDocument } from "./config/swagger.js";
import { prisma } from "./lib/prisma.js";
import { env } from "./config/env.js";
import { API_ROUTES } from "./config/constants.js";

import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { jobsRouter } from "./modules/jobs/jobs.routes.js";
import { applicationsRouter } from "./modules/applications/applications.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { matchingRouter } from "./modules/matching/matching.routes.js";
import { aiModelsRouter } from "./modules/ai-models/ai-models.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { organizationsRouter } from "./modules/organizations/organizations.routes.js";
import { interviewsRouter } from "./modules/interviews/interviews.routes.js";

const app = express();

app.set("trust proxy", env.TRUST_PROXY);

// X-Request-ID Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId =
    (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
});

applySecurityMiddleware(app);

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
app.use(API_ROUTES.AUTH, authRouter);
app.use(API_ROUTES.USERS, usersRouter);
app.use(API_ROUTES.JOBS, jobsRouter);
app.use(API_ROUTES.APPLICATIONS, applicationsRouter);
app.use(API_ROUTES.ADMIN, adminRouter);
app.use(API_ROUTES.MATCHING, matchingRouter);
app.use(API_ROUTES.AI_MODELS, aiModelsRouter);
app.use(API_ROUTES.NOTIFICATIONS, notificationsRouter);
app.use(API_ROUTES.ORGANIZATIONS, organizationsRouter);
app.use(API_ROUTES.INTERVIEWS, interviewsRouter);

app.use(notFoundMiddleware);
app.use(globalErrorHandler);

export { app };
