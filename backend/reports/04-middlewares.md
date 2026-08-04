# Sub-Agent 4 — Middleware Pipeline Audit

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Scope**: Express Middleware Architecture, Registration Order, Authentication, Authorization, Validation, Security Controls, Rate Limiting, Logging, and Error Propagation.

---

## 1. Complete Middleware Registration Sequence

The execution order of Express middlewares is explicitly configured inside [`backend/src/app.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/app.ts):

```
Step  1: Request Context Middleware (x-request-id)
         └─ Attaches / propagates unique X-Request-ID header via crypto.randomUUID()
Step  2: Security & Transport Middlewares (applySecurityMiddleware)
         ├─ helmet() -> Sets HTTP security headers
         ├─ cors() -> Validates origin against ALLOWED_CORS_ORIGINS
         ├─ pinoHttp() -> Redacts sensitive headers (Authorization, Cookie, X-CSRF-Token)
         ├─ compression() -> Gzip HTTP response payloads
         ├─ cookieParser() -> Parses incoming HTTP cookies
         └─ express.json() & express.urlencoded() -> Payload size limits (1mb)
Step  3: Static Asset Serving
         └─ /uploads -> Served securely via express.static() from UPLOAD_DIR
Step  4: Health & Documentation Endpoints
         ├─ /health -> Database connectivity check (SELECT 1)
         ├─ /docs.json -> Serves OpenAPI specification JSON
         └─ /docs -> Swagger UI interactive interface
Step  5: Global Rate Limiting
         └─ globalRateLimiter -> 100 requests per 15-minute window per IP
Step  6: CSRF Double Submit Verification
         └─ verifyCsrf -> Validates X-CSRF-Token header against _csrf cookie on state-changing requests
Step  7: Feature Route Modules (/api/v1/*)
         ├─ authenticate -> Verifies Bearer JWT or access_token cookie
         ├─ requireRole -> Enforces Role-Based Access Control (ADMIN vs CANDIDATE)
         ├─ uploadRateLimiter -> 20 upload requests per 15-minute window
         └─ validateBody / validateQuery -> Zod runtime schema validation
Step  8: Route Fallback & Not Found
         └─ notFoundMiddleware -> Intercepts unmatched URIs and yields 404
Step  9: Global Error Handler
         └─ globalErrorHandler -> Formats ZodError, AppError, Prisma Known Errors, Jose JWT Errors
```

---

## 2. Exhaustive Audit of Individual Middlewares

### 1. Request ID Middleware (`app.ts:L34-L40`)
- **Mechanism**: Extracts `X-Request-ID` header from request or generates a new `crypto.randomUUID()`.
- **Purpose**: Enables distributed tracing across application log streams.

### 2. Security Middleware (`security.middleware.ts`)
- **Helmet**: Secures HTTP headers (HSTS, Content Security Policy, X-Frame-Options, X-Content-Type-Options).
- **CORS**: Validates origins against `ALLOWED_CORS_ORIGINS`. Allows requests without origin (mobile/curl). Supports credentials.
- **Pino HTTP Logging**: Logs incoming HTTP requests while redacting `Authorization`, `Cookie`, and `X-CSRF-Token` headers for privacy.

### 3. Rate Limiting Middleware (`rate-limit.middleware.ts`)
The system implements **7 granular rate limiters** defined in [`rate-limit.middleware.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/middlewares/rate-limit.middleware.ts).
All rate limiters automatically attach `RedisStore` from `rate-limit-redis` via the centralized Redis client ([`src/lib/redis.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/redis.ts)) when `REDIS_URL` is set, seamlessly falling back to in-memory tracking when unconfigured:

| Rate Limiter | Limit | Window | Applied To | Store Engine |
| :--- | :--- | :--- | :--- | :--- |
| `globalRateLimiter` | 100 requests | 15 minutes | All API routes globally (`app.ts:L72`) | Redis / Memory |
| `authRateLimiter` | 10 requests | 15 minutes | `/api/v1/auth/forgot-password`, `/api/v1/auth/reset-password` | Redis / Memory |
| `authLoginRateLimiter` | 5 requests | 15 minutes | `/api/v1/auth/login` | Redis / Memory |
| `authRegisterRateLimiter` | 5 requests | 1 hour | `/api/v1/auth/register` | Redis / Memory |
| `authRefreshRateLimiter` | 15 requests | 15 minutes | `/api/v1/auth/refresh` | Redis / Memory |
| `authMfaRateLimiter` | 5 requests | 15 minutes | `/api/v1/auth/mfa/login`, `/api/v1/auth/mfa/verify` | Redis / Memory |
| `uploadRateLimiter` | 20 requests | 15 minutes | `/api/v1/jobs/:jobId/apply` (`app.ts:L91`) | Redis / Memory |

### 4. CSRF Middleware (`csrf.middleware.ts`)
- **Pattern**: Double Submit Cookie CSRF Verification.
- **Constant-Time Verification**: Token validation uses constant-time comparison via `crypto.timingSafeEqual()` with length check safeguards (`bufCookie.length === 0 || bufHeader.length === 0 || bufCookie.length !== bufHeader.length`) to prevent side-channel timing attacks.
- **Rules**:
  - Safe HTTP methods (`GET`, `HEAD`, `OPTIONS`) bypass check.
  - Requests with `Authorization: Bearer <token>` bypass check (immune to browser-initiated cross-site forgery).
  - State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) relying on cookie authentication must submit matching `X-CSRF-Token` header.

### 5. Authentication & RBAC Middleware (`auth.middleware.ts`)
- **`authenticate`**: Extracts JWT token from `Authorization: Bearer <token>` header or `access_token` cookie. Verifies signature using `verifyAccessToken()`. Attaches decoded payload to `req.user`.
- **`requireRole(...allowedRoles)`**: Compares `req.user.role` against allowed `UserRole` enums (`ADMIN`, `CANDIDATE`). Returns 403 Forbidden on role mismatch.

### 6. File Upload Middleware (`upload.middleware.ts`)
- **Engine**: Multer disk storage. Files are streamed to a `temp/` subdirectory under `UPLOAD_DIR` to avoid V8 memory heap consumption ([upload.middleware.ts:L25-L33](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/middlewares/upload.middleware.ts#L25-L33)).
- **File Validation**: Accepts `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `image/jpeg`, `image/png`, and `image/webp` files under 10MB (`MAX_FILE_SIZE`). Maximum 5 files per request ([upload.middleware.ts:L8-L15](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/middlewares/upload.middleware.ts#L8-L15)).

### 7. Request Validation Middleware (`validate.middleware.ts`)
- **Functions**: `validateBody(schema)`, `validateQuery(schema)`, `validateParams(schema)`.
- **Behavior**: Executes `schema.parseAsync()`. Throws `ZodError` on mismatch, caught seamlessly by `globalErrorHandler`.

### 8. Tenant Isolation Middleware (`tenant.middleware.ts`)
- **Function**: `requireTenantAccess` ([tenant.middleware.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/middlewares/tenant.middleware.ts)).
- **Protected Routes**: Attached across `jobs.routes.ts`, `applications.routes.ts`, `matching.routes.ts`, `ai-models.routes.ts`, and `admin.routes.ts` immediately after `authenticate`.
- **Mechanism**: Resolves requested organization ID from `req.params.organizationId`, `req.params.orgId`, `req.query.organizationId`, `req.query.orgId`, `req.headers['x-organization-id']`, or `req.headers['x-tenant-id']`. Compares it against `req.user.organizationId` (from verified JWT). Returns 403 Forbidden on mismatch.
- **Audit Tracking**: Automatically records a `CROSS_TENANT_ACCESS_ATTEMPT` entry in `AuditLog` containing user ID, requested organization ID, HTTP path, method, IP address, and user agent upon access violation.

### 9. Error Propagation Middleware (`error.middleware.ts`)
- **Central Handling**: Converts errors into standardized JSON outputs.
- **Error Types Managed**:
  - `ZodError` -> Returns HTTP 400 with itemized field paths and messages.
  - `AppError` -> Returns explicit HTTP status code (`statusCode`) and message.
  - `PrismaKnownRequestError` -> Maps database error codes (`P2002` -> 409 Conflict, `P2003` -> 400 Bad Request, `P2025` -> 404 Not Found).
  - `Jose Error` -> Maps expired or malformed JWT errors to HTTP 401 Unauthorized.
  - `Multer Error` -> Returns HTTP 400 File Upload Error.
