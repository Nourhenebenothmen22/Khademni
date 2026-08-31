# Sub-Agent 4 — Middleware Pipeline Audit & Verification Report

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Status**: Verified & Synchronized with Current Codebase  
**Scope**: Express Middleware Architecture, Registration Order, Authentication, Super Admin Clearance, Multi-Tenant Isolation, Binary Magic-Byte Upload Validation, Security Controls, 8 Redis Rate Limiters, Logging, and Error Propagation.

---

## 1. Complete Middleware Registration Sequence

The execution order of Express middlewares is explicitly configured inside [`backend/src/app.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/app.ts):

```
Step  1: Trust Proxy Configuration
         └─ app.set("trust proxy", env.TRUST_PROXY) (default "loopback")
Step  2: Request Context Middleware (x-request-id)
         └─ Attaches / propagates unique X-Request-ID header via crypto.randomUUID()
Step  3: Security & Transport Middlewares (applySecurityMiddleware)
         ├─ helmet() -> Sets HTTP security headers (CORP cross-origin)
         ├─ cors() -> Validates origin; whitelists X-Organization-Id / X-Tenant-Id
         ├─ pinoHttp() -> Redacts sensitive headers (Authorization, Cookie, X-CSRF-Token)
         ├─ compression() -> Gzip HTTP response payloads
         ├─ cookieParser() -> Parses incoming HTTP cookies
         └─ express.json() & express.urlencoded() -> Payload size limits (1mb)
Step  4: Static Asset Serving & Health / Documentation Endpoints
         ├─ /health -> Database connectivity check (SELECT 1)
         ├─ /docs.json -> Serves OpenAPI specification JSON
         └─ /docs -> Swagger UI interactive interface
Step  5: Global Rate Limiting
         └─ globalRateLimiter -> 100 requests per 15-minute window per IP (Redis-backed)
Step  6: CSRF Double Submit Verification
         └─ verifyCsrf -> Validates X-CSRF-Token header against _csrf cookie with crypto.timingSafeEqual
Step  7: Feature Route Modules (/api/v1/*)
         ├─ authenticate -> Verifies Bearer JWT or access_token cookie
         ├─ requireRole -> Enforces Role-Based Access Control (ADMIN vs CANDIDATE)
         ├─ requireSuperAdmin -> Strictly validates req.user.isSuperAdmin === true
         ├─ requireTenantAccess -> Blocks cross-tenant data queries
         ├─ uploadRateLimiter / webhookRateLimiter -> Dedicated endpoint rate throttles
         ├─ uploadMiddleware / avatarUploadMiddleware -> In-memory binary magic-byte detection (file-type)
         └─ validateBody / validateQuery -> Zod runtime schema validation
Step  8: Route Fallback & Not Found
         └─ notFoundMiddleware -> Intercepts unmatched URIs and yields 404
Step  9: Global Error Handler
         └─ globalErrorHandler -> Formats ZodError, AppError, Prisma Known Errors, Jose JWT Errors
```

---

## 2. Exhaustive Audit of Individual Middlewares

### 1. Authentication & Super Admin (`auth.middleware.ts`)
- **`authenticate`**: Verifies JWT Bearer token via Jose, extracts `userId`, `role`, `organizationId`, and `isSuperAdmin`.
- **`requireSuperAdmin`**: Enforces `req.user.isSuperAdmin === true`. Header-based bypasses (`X-Super-Admin`) have been completely removed.

### 2. Multi-Tenant Scoping (`tenant.middleware.ts`)
- **`requireTenantAccess`**: Extracts tenant context from URL params, query strings, or headers (`X-Organization-Id`) and ensures it matches the authenticated user's `organizationId`. Logs `CROSS_TENANT_ACCESS_ATTEMPT` audit records on violation.

### 3. Binary Magic-Byte Upload Validation (`upload.middleware.ts` & `avatar-upload.middleware.ts`)
- Uses Multer `memoryStorage` to buffer file streams in RAM.
- Calls `fileTypeFromBuffer` from `file-type` to detect actual binary headers (PDF: `%PDF`, JPEG: `\xFF\xD8\xFF`, PNG: `\x89PNG\r\n\x1a\n`, DOCX: PK zip magic bytes).
- Completely ignores and overrides spoofed client `Content-Type` headers.
- Sanitizes file extensions and generates secure unguessable disk storage names with random prefixes.

### 4. Rate Limiting Middleware (`rate-limit.middleware.ts`)
The system implements **8 granular rate limiters** backed by Redis 7 (`rate-limit-redis`) with in-memory fallback:

| Limiter | Limit | Window | Target Scope |
|---|:---:|:---:|---|
| `globalRateLimiter` | 100 req | 15 min | All platform endpoints |
| `authRateLimiter` | 5 req | 15 min | `/api/v1/auth/login`, `/register`, `/reset-password` |
| `matchingRateLimiter` | 10 req | 1 min | `/api/v1/matching/run` |
| `uploadRateLimiter` | 20 req | 15 min | Application CV document uploads |
| `avatarUploadRateLimiter` | 10 req | 15 min | User avatar picture uploads |
| `webhookRateLimiter` | 60 req | 1 min | Brevo webhook listener |
| `jobApplyRateLimiter` | 10 req | 15 min | Candidate application submissions |
| `candidateSearchRateLimiter` | 30 req | 1 min | Job post search queries |
