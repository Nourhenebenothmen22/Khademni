import "./zod-openapi.js";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import * as validators from "../common/validators/index.js";

const registry = new OpenAPIRegistry();

// Register JWT Bearer Authentication Security Scheme
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description:
    "Provide your JWT access token (Bearer <token>) to authenticate requests.",
});

// Register all exported Zod schemas from common/validators
Object.entries(validators).forEach(([name, schema]) => {
  if (
    schema &&
    typeof schema === "object" &&
    schema instanceof z.ZodType &&
    typeof (schema as unknown as Record<string, unknown>).openapi === "function"
  ) {
    registry.register(name, schema);
  }
});

// Register API Routes
registry.registerPath({
  method: "post",
  path: "/api/v1/auth/register",
  tags: ["Auth"],
  summary: "Register a new user account",
  request: {
    body: {
      content: {
        "application/json": { schema: validators.registerUserSchema },
      },
    },
  },
  responses: {
    201: { description: "User registered successfully" },
    400: { description: "Validation error" },
    409: { description: "Email already registered" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/login",
  tags: ["Auth"],
  summary: "Authenticate user and issue tokens",
  request: {
    body: {
      content: {
        "application/json": { schema: validators.loginSchema },
      },
    },
  },
  responses: {
    200: { description: "Login successful" },
    401: { description: "Invalid credentials" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/refresh",
  tags: ["Auth"],
  summary: "Refresh access token",
  responses: {
    200: { description: "Tokens refreshed successfully" },
    401: { description: "Invalid or revoked refresh token" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/users/me",
  tags: ["Users"],
  summary: "Get current authenticated user profile",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Profile retrieved successfully" },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/jobs",
  tags: ["Jobs"],
  summary: "List job postings with optional filters",
  responses: {
    200: { description: "List of job postings" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/jobs",
  tags: ["Jobs"],
  summary: "Create a new job posting",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: validators.createJobPostSchema },
      },
    },
  },
  responses: {
    201: { description: "Job post created" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/jobs/{jobId}/apply",
  tags: ["Applications"],
  summary: "Submit job application with CV document upload",
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: "jobId",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    201: { description: "Application submitted successfully" },
    400: { description: "Validation error or invalid document" },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/applications",
  tags: ["Applications"],
  summary: "List submitted job applications",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "List of applications" },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/matching/run",
  tags: ["AI Matching"],
  summary: "Run AI matching for a job application or batch job post",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Matching run executed or enqueued" },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/matching/status/{queueJobId}",
  tags: ["AI Matching"],
  summary: "Get status of background matching job",
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: "queueJobId",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: { description: "Job status and progress" },
    404: { description: "Job not found" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/ai-models",
  tags: ["AI Models"],
  summary: "List registered AI matching models",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "List of AI models" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/admin/stats",
  tags: ["Admin"],
  summary: "Get system analytics and dashboard statistics",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "System statistics" },
    403: { description: "Forbidden" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/auth/csrf",
  tags: ["Auth"],
  summary: "Issue Double Submit CSRF Cookie",
  responses: {
    200: { description: "CSRF token cookie issued" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/forgot-password",
  tags: ["Auth"],
  summary: "Request password reset email",
  request: {
    body: {
      content: {
        "application/json": { schema: validators.resetPasswordRequestSchema },
      },
    },
  },
  responses: {
    200: { description: "Password reset token sent if email exists" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/reset-password",
  tags: ["Auth"],
  summary: "Reset user password using token",
  request: {
    body: {
      content: {
        "application/json": { schema: validators.resetPasswordSchema },
      },
    },
  },
  responses: {
    200: { description: "Password reset successful" },
    400: { description: "Invalid token or password requirements" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/users/me",
  tags: ["Users"],
  summary: "Update profile of authenticated user",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: validators.updateUserSchema },
      },
    },
  },
  responses: {
    200: { description: "Profile updated successfully" },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/jobs/{id}",
  tags: ["Jobs"],
  summary: "Get detailed job post by ID",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  responses: {
    200: { description: "Job post details" },
    404: { description: "Job post not found" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/applications/{id}/status",
  tags: ["Applications"],
  summary: "Update application status (Admin only)",
  security: [{ bearerAuth: [] }],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ],
  request: {
    body: {
      content: {
        "application/json": { schema: validators.updateApplicationStatusSchema },
      },
    },
  },
  responses: {
    200: { description: "Status updated successfully" },
    400: { description: "Invalid status transition" },
    403: { description: "Forbidden" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/admin/users",
  tags: ["Admin"],
  summary: "List all platform users with filtering",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Paginated users list" },
    403: { description: "Forbidden" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/admin/audit-logs",
  tags: ["Admin"],
  summary: "Query system security audit logs",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Paginated audit logs" },
    403: { description: "Forbidden" },
  },
});


const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiDocument = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    title: "Intelligent Teacher Recruitment Platform API",
    version: "1.0.0",
    description:
      "Backend REST API for Intelligent Teacher Recruitment Platform featuring AI matching, application parsing, and role-based recruitment workflows.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Development Server",
    },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
});

