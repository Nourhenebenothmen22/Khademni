# Sub-Agent 2 — API Layer Audit

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Scope**: REST API Endpoints, Controllers, Routing Architecture, DTOs, Input Validation Schemas, Response Formats, Request Lifecycle, and API Versioning.

---

## 1. Controller & Route Topology

All API endpoints are prefixed with `/api/v1/` and registered centrally inside [`backend/src/app.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/app.ts#L78-L94):

| Endpoint Route Prefix | Module | Route File | Controller File | Primary Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/auth` | `auth` | [`auth.routes.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/auth/auth.routes.ts) | [`auth.controller.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/auth/auth.controller.ts) | User registration, login, logout, refresh tokens, MFA, password resets |
| `/api/v1/users` | `users` | [`users.routes.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/users/users.routes.ts) | [`users.controller.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/users/users.controller.ts) | Profile retrieval, update, password change, user listing (Admin) |
| `/api/v1/jobs` | `jobs` | [`jobs.routes.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/jobs/jobs.routes.ts) | [`jobs.controller.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/jobs/jobs.controller.ts) | Job posting CRUD, keywords management, matching rule definitions |
| `/api/v1/applications` | `applications` | [`applications.routes.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/applications/applications.routes.ts) | [`applications.controller.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/applications/applications.controller.ts) | Application tracking, document uploads, status transitions |
| `/api/v1/admin` | `admin` | [`admin.routes.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/admin/admin.routes.ts) | [`admin.controller.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/admin/admin.controller.ts) | System stats, overview metrics, audit logs, background queue monitoring |
| `/api/v1/matching` | `matching` | [`matching.routes.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/matching/matching.routes.ts) | [`matching.controller.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/matching/matching.controller.ts) | On-demand matching run, batch queue triggering, candidate score breakdown |
| `/api/v1/ai-models` | `ai-models` | [`ai-models.routes.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/ai-models/ai-models.routes.ts) | [`ai-models.controller.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/ai-models/ai-models.controller.ts) | Model register, model activation, metric evaluation logging |
| `/api/v1/notifications` | `notifications` | [`notifications.routes.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/notifications/notifications.routes.ts) | [`notifications.controller.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/notifications/notifications.controller.ts) | Fetch unread notifications, mark notification read/all read |

---

## 2. Request Lifecycle & Routing Architecture

Every incoming HTTP request undergoes a structured, step-by-step pipeline:

```
1. Request Initialization
   ├─ X-Request-ID Generation / Propagation (app.ts:L34-L40)
   ├─ Helmet Security Headers Injection (security.middleware.ts:L13)
   ├─ Pino HTTP Request Logging (security.middleware.ts:L37-L44)
   └─ Cookie & JSON Body Parser (security.middleware.ts:L48-L51)
       │
2. Global Rate Limiter
   └─ Express Rate Limit (app.ts:L72 -> rate-limit.middleware.ts:L5-L16)
       │
3. Double Submit CSRF Verification
   └─ verifyCsrf Middleware (app.ts:L75 -> csrf.middleware.ts:L42-L75)
       │
4. Feature Sub-Router Match (/api/v1/:module)
   ├─ Auth Middleware (authenticate) -> Attaches req.user
   ├─ RBAC Middleware (requireRole) -> Verifies user permissions
   └─ Validation Middleware (validateBody/validateQuery) -> Validates Zod Schema
       │
5. Controller Execution
   └─ Invokes Controller -> Delegates to Service -> Sends JSON Response (200, 201)
       │
6. Error & Not-Found Fallbacks
   ├─ Not Found Middleware (not-found.middleware.ts:L4-L12) -> Delegates 404 AppError to Global Error Handler
   └─ Global Error Handler (error.middleware.ts:L54-L175) -> Catches AppError, ZodError, Prisma, Jose JWT
```

---

## 3. DTOs, Schemas & Input Validation

The system enforces strict type validation at the API edge using **Zod Schemas** located in [`backend/src/common/validators/`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/validators).

### Key Validators Audit
- **Authentication**: `loginSchema`, `verifyEmailSchema`, `mfaLoginSchema`, `mfaVerifySchema`, `resetPasswordRequestSchema`, `resetPasswordSchema` ([auth.validators.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/validators/auth.validators.ts)), and `registerUserSchema` ([user.validators.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/validators/user.validators.ts)).
- **Job Posts**: `createJobPostSchema`, `updateJobPostSchema`, `jobPostQuerySchema` ([job-post.validators.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/validators/job-post.validators.ts)).
- **Applications**: `createApplicationSchema`, `updateApplicationStatusSchema` ([application.validators.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/validators/application.validators.ts)).
- **AI Matching**: `createAIModelSchema`, `evaluateAIModelSchema` ([ai-matching-model.validators.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/validators/ai-matching-model.validators.ts)).

### Open-API Integration & Route Registration
Routes use `@asteasolutions/zod-to-openapi` to automatically project Zod schemas into an OpenAPI 3.0 specification ([`swagger.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/config/swagger.ts)):
- **Path Registrations**: All endpoints across `auth`, `users`, `jobs`, `applications`, `matching`, `ai-models`, `admin`, and `notifications` are registered using `registry.registerPath()`.
- **Generation Script**: `npm run openapi:generate` executes [`scripts/generate-openapi.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/scripts/generate-openapi.ts) to compile and save the OpenAPI 3.0 document directly to [`openapi.json`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/openapi.json).
- **Interactive UI & JSON Endpoints**: `GET /docs` (Swagger UI) and `GET /docs.json` ([app.ts:L65-L70](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/app.ts#L65-L70)).

---

## 4. Response Standardization & Error Contract

### Standard Success Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional descriptive summary message"
}
```

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Human-readable error explanation",
  "errors": [
    {
      "path": "email",
      "message": "Invalid email address format"
    }
  ]
}
```

---

## 5. API Versioning Strategy

- **URL Prefix Versioning**: API versioning is managed via explicit URI segment `/api/v1/`.
- **Extensibility**: Non-breaking updates maintain `/api/v1/`, while major breaking structural revisions can be mounted alongside under `/api/v2/`.
