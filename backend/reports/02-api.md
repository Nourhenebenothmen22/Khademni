# Sub-Agent 2 — API Layer Audit & Specification Report

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Status**: Verified & Synchronized with Current Codebase  
**Scope**: REST API Endpoints, Controllers, Routing Architecture, DTOs, Input Validation Schemas, Response Formats, Request Lifecycle, and OpenAPI 3.0 Registration.

---

## 1. Controller & Route Topology

All API endpoints are prefixed with `/api/v1/` and registered centrally inside [`backend/src/app.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/app.ts):

| Route Prefix | Module | Route File | Controller File | Primary Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/auth` | `auth` | `auth.routes.ts` | `auth.controller.ts` | Registration, login, logout, refresh tokens, MFA TOTP, password reset |
| `/api/v1/users` | `users` | `users.routes.ts` | `users.controller.ts` | Profile retrieval, update, password change, avatar image streaming |
| `/api/v1/jobs` | `jobs` | `jobs.routes.ts` | `jobs.controller.ts` | Job posting CRUD, keywords management, matching rule definitions |
| `/api/v1/applications` | `applications` | `applications.routes.ts` | `applications.controller.ts` | Application tracking, document uploads, status state machine transitions |
| `/api/v1/interviews` | `interviews` | `interviews.routes.ts` | `interviews.controller.ts` | Interview scheduling, RFC 5545 `.ics` downloads, scorecards, Brevo webhook |
| `/api/v1/organizations` | `organizations` | `organizations.routes.ts` | `organizations.controller.ts` | Scoped organization directory, tenant profile update |
| `/api/v1/matching` | `matching` | `matching.routes.ts` | `matching.controller.ts` | On-demand matching run, batch queue triggering, candidate score breakdown |
| `/api/v1/ai-models` | `ai-models` | `ai-models.routes.ts` | `ai-models.controller.ts` | Model registry, model activation, metric evaluation logging (`requireSuperAdmin`) |
| `/api/v1/admin` | `admin` | `admin.routes.ts` | `admin.controller.ts` | Dashboard analytics, user provisioning, tenant audit logs |
| `/api/v1/notifications` | `notifications` | `notifications.routes.ts` | `notifications.controller.ts` | Fetch unread notifications, mark read/all read |

---

## 2. Request Lifecycle & Routing Architecture

```
1. Request Initialization
   ├─ Trust Proxy Verification (app.set("trust proxy", env.TRUST_PROXY))
   ├─ X-Request-ID Generation / Propagation (crypto.randomUUID())
   ├─ Helmet Security Headers Injection
   ├─ Pino HTTP Request Logging (Redacting Auth, Cookie, CSRF headers)
   └─ Cookie & JSON Body Parser (1mb limit)
       │
2. Global Rate Limiter
   └─ globalRateLimiter -> 100 requests per 15-minute window per IP (Redis-backed)
       │
3. Double Submit CSRF Verification
   └─ verifyCsrf Middleware -> crypto.timingSafeEqual comparison
       │
4. Feature Sub-Router Match (/api/v1/:module)
   ├─ Auth Middleware (authenticate) -> Attaches req.user (including isSuperAdmin)
   ├─ Tenant Isolation Middleware (requireTenantAccess) -> Enforces organization boundary
   ├─ RBAC Middleware (requireRole / requireSuperAdmin) -> Verifies user permissions
   └─ Validation Middleware (validateBody / validateQuery) -> Validates Zod Schema
       │
5. Controller Execution
   └─ Invokes Controller -> Delegates to Service -> Sends Standardized JSON Response
       │
6. Error & Not-Found Fallbacks
   ├─ notFoundMiddleware -> Intercepts unmatched URIs and yields 404
   └─ globalErrorHandler -> Formats ZodError, AppError, Prisma, Jose JWT
```

---

## 3. OpenAPI 3.0 & Documentation

All routes and Zod schemas are registered into the OpenAPIRegistry via [`swagger.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/config/swagger.ts). Running `npm run openapi:generate` outputs the complete specification to [`openapi.json`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/openapi.json), viewable interactively via Swagger UI at `/docs`.
