# Sub-Agent 7 — Authentication & Security Audit

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Scope**: Authentication, Token Signatures, Password Hashing, RBAC Permissions, CSRF Protection, Secret Management, Input Sanitization, and Security Headers.

---

## 1. Authentication Engine & Token Architecture

Authentication is powered by **Jose JWT Library (`jose`)** and **Argon2 Password Hashing**:

```
[ Candidate / Recruiter ]
          │
          ├─ Login Request (POST /api/v1/auth/login)
          │      │
          │      ▼
          │  Argon2 Password Hash Verification (lib/password.ts)
          │      │
          │      ▼
          ├─ Generates Access Token (JWT, 15-min expiry, HS256) (lib/jwt.ts:L14-L25)
          ├─ Generates Refresh Token (JWT, 7-day expiry, HS256) (lib/jwt.ts:L36-L47)
          ├─ Persists AuthSession with SHA-256 Refresh Token Hash in DB
          └─ Sets HTTP-Only Cookies / Returns Bearer Tokens
```

### Access vs. Refresh Token Specification

| Attribute | Access Token | Refresh Token |
| :--- | :--- | :--- |
| **Signing Library** | `jose` (`SignJWT`) | `jose` (`SignJWT`) |
| **Algorithm** | `HS256` | `HS256` |
| **Secret Key** | `JWT_ACCESS_SECRET` | `JWT_REFRESH_SECRET` |
| **Expiration** | 15 Minutes | 7 Days |
| **Payload Content** | `userId`, `role`, `organizationId`, `jti` | `userId`, `role`, `organizationId`, `jti` |
| **Storage Location** | `Authorization: Bearer` header or `access_token` Cookie | `refresh_token` HTTP-Only Cookie & Database Hash |

### Refresh Token Rotation & Race Condition Defense
- **Interactive Prisma Transaction**: `refreshSession` ([auth.service.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/auth/auth.service.ts)) executes inside an interactive transaction (`prisma.$transaction`).
- **Atomic Session Claiming**: Uses optimistic locking via `tx.authSession.updateMany({ where: { refreshTokenHash, revokedAt: null, expiresAt: { gt: now } }, data: { revokedAt: now } })` to ensure only one concurrent request can claim an active refresh session.
- **10-Second Grace Period**: If a token has already been revoked within $\le 10$ seconds (`now - revokedAt <= 10s`), it is treated as a legitimate concurrent network retry. New valid tokens are issued without revoking all user sessions.
- **Breach Detection & Total Session Invalidated**: Reusing a refresh token after the 10-second grace period ($\Delta t > 10\text{s}$) indicates a stolen token reuse attack. All active sessions for the user are immediately revoked (`revokedAt = now`), a `SECURITY_BREACH_REFRESH_TOKEN_REUSE` event is logged to `AuditLog`, and HTTP 401 Unauthorized is returned.

---

## 2. Password Hashing & Secret Management

- **Password Hashing**: Uses **Argon2** (`argon2.hash()`) ([password.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/password.ts#L8-L23)). Resistant to GPU cracking and side-channel timing attacks.
- **Secret Token Hashing**: Verification tokens (Email Verification, Password Reset, Refresh Tokens) are stored in PostgreSQL using **SHA-256 Hashes** (`hashToken()`) ([token.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/token.ts#L16-L18)), ensuring database compromises do not leak raw active tokens.
- **Cloud Secret Management Abstraction**: Centralized manager ([secrets.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/secrets.ts)) supports `env`, `aws` (AWS Secrets Manager), and `vault` (HashiCorp Vault) providers.

---

## 3. Authorization & Role-Based Access Control (RBAC)

RBAC is enforced using the `requireRole()` middleware ([auth.middleware.ts:L41-L62](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/middlewares/auth.middleware.ts#L41-L62)):

- **User Roles (`UserRole`)**:
  1. `ADMIN`: System administration, job posting management, AI model tuning, queue monitoring, full candidate review.
  2. `CANDIDATE`: Job application submission, profile updates, application tracking, notification management.

### Route Access Matrix

| Route Endpoint Pattern | Required Role | Auth Middleware applied |
| :--- | :--- | :--- |
| `/api/v1/auth/*` | Public / Authenticated | Selective (`authenticate` on `/logout`, `/me`, `/mfa/*`) |
| `/api/v1/jobs` (GET) | Public | None |
| `/api/v1/jobs` (POST, PATCH, DELETE) | `ADMIN` | `authenticate`, `requireRole("ADMIN")` |
| `/api/v1/applications` (POST) | `CANDIDATE` | `authenticate`, `requireRole("CANDIDATE")` |
| `/api/v1/applications` (GET /:id) | `CANDIDATE` / `ADMIN` | Owner Candidate or Admin check |
| `/api/v1/matching/*` | `ADMIN` | `authenticate`, `requireRole("ADMIN")` |
| `/api/v1/admin/*` | `ADMIN` | `authenticate`, `requireRole("ADMIN")` |
| `/api/v1/ai-models/*` | `ADMIN` | `authenticate`, `requireRole("ADMIN")` |

### Tenant Isolation
- **Middleware**: `requireTenantAccess` ([tenant.middleware.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/middlewares/tenant.middleware.ts)).
- **HTTP Header/Parameter Resolution**: Resolves requested organization ID from `req.params.organizationId`, `req.params.orgId`, `req.query.organizationId`, `req.query.orgId`, `req.headers['x-organization-id']`, or `req.headers['x-tenant-id']`. Compares it against the authenticated user's `organizationId` from the cryptographically verified JWT payload. Returns 403 Forbidden on cross-tenant access attempts.
- **Controller-Level Org Extraction**: Enforces `getOrganizationId(req)` helper across controllers (`admin.controller.ts`, `jobs.controller.ts`, `applications.controller.ts`, `matching.controller.ts`), extracting `req.user.organizationId` directly from the authenticated JWT payload and raising a 403 Forbidden if missing.
- **Service-Level Query Scoping**: All Prisma queries across business services are strongly typed (`Prisma.UserWhereInput`, `Prisma.JobPostWhereInput`, `Prisma.ApplicationWhereInput`, `Prisma.MatchingRunWhereInput`, `Prisma.AuditLogWhereInput`) and explicitly scoped by `organizationId`:
  - `admin.service.ts`: Scopes users (`organizationId`), job posts (`organizationId`), applications (`jobPost: { organizationId }`), audit logs (`organizationId`), and performs atomic `updateMany` for user status toggles.
  - `jobs.service.ts`: Scopes `createJobPost` with `organizationId` from JWT, `updateJobPost` with `findFirst({ where: { id, organizationId } })`, and `deleteJobPost` with `findFirst({ where: { id, organizationId } })`.
  - `applications.service.ts`: Scopes `getApplications` and `updateApplicationStatus` with `jobPost: { organizationId }`, and cleans up physical CV files on storage errors.
  - `matching.service.ts` & `matching-queue.service.ts`: Scopes `runMatching`, `enqueueJobMatching`, `getMatchingRun`, `getMatchingRuns`, and `getApplicationScore` with `jobPost: { organizationId }`, returning 404/403 if target job post does not belong to the caller's tenant.
- **JWT Refresh Token Propagation**: `auth.service.ts` (`refreshSession`) explicitly retains `organizationId` during token rotation (`signAccessToken` and `signRefreshToken`), ensuring active session context is preserved across token refreshes.
- **Password Reset Security & Lockout Clearing**: `resetPassword` in `auth.service.ts` updates `passwordHash` and `passwordChangedAt` while clearing `failedLoginAttempts: 0` and `lockedUntil: null`, restoring account access upon successful token verification.
- **Tenant-Aware Audit Logging**: `logAuditAction({ userId, organizationId, action, entityType, entityId, metadata })` in `lib/audit.ts` populates `organizationId` across all modules (`auth`, `users`, `jobs`, `applications`, `admin`), enabling tenant-specific audit trails.
- **Profile Email Security**: When a user changes their email address via `updateProfile` in `users.service.ts`, `isEmailVerified` is automatically set to `false`, a new email verification token is created, and `sendVerificationEmail` is dispatched post-commit to verify ownership of the new email address.
- **Audit Logging**: Logs `CROSS_TENANT_ACCESS_ATTEMPT` entries to `AuditLog` table containing user ID, requested organization ID, HTTP path, method, IP address, and user agent upon violation.
- **Active Route Protection**: Attached across `jobs.routes.ts`, `applications.routes.ts`, `matching.routes.ts`, `ai-models.routes.ts`, and `admin.routes.ts` immediately after `authenticate`.

---

## 4. Multi-Factor Authentication (MFA / TOTP)

- **Library**: `otplib` (Time-based One-Time Password) & `qrcode`.
- **Workflow**: User enables MFA -> Server generates TOTP Secret (`authenticator.generateSecret()`) and QR code data URL -> User confirms initial TOTP code -> `mfaEnabled` flag set to `true` on User model.
- **Payload Alignment**: `loginController` in `auth.controller.ts` wraps `mfaRequired`, `userId`, and `message` inside a unified `data` object for consistent REST API responses.

---

## 5. Security Middleware & Defense-in-Depth

1. **Double Submit Cookie CSRF Protection**: Enforced via `verifyCsrf` ([csrf.middleware.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/middlewares/csrf.middleware.ts)) using constant-time `crypto.timingSafeEqual()` validation with non-empty buffer checks.
2. **Helmet HTTP Headers & CORP Policy**: Enforces strict CSP, HSTS, frameguard, disables `X-Powered-By`, and configures `crossOriginResourcePolicy: { policy: "cross-origin" }` in `security.middleware.ts` to allow cross-origin media embedding. Avatar media stream routes in `users.controller.ts` explicitly set `Cross-Origin-Resource-Policy: cross-origin`.
3. **CORS Allowed Headers Whitelist**: Explicitly configures `allowedHeaders` with `Content-Type`, `Authorization`, `X-Request-ID`, `X-CSRF-Token`, `X-Organization-Id`, and `X-Tenant-Id`.
4. **Pino Header Redaction**: Redacts `Authorization`, `Cookie`, and `X-CSRF-Token` headers from application logs ([security.middleware.ts:L40](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/middlewares/security.middleware.ts#L40)).
5. **Input Sanitization & Type Enforcement**: All HTTP requests are parsed against strict Zod validation schemas.
6. **Path Traversal Protection**: File storage key resolver ([file-storage.ts:L13-L22](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/file-storage.ts#L13-L22)) sanitizes relative paths and enforces directory boundary checks.

---

## 6. Production Secret Enforcement & Docker Security

> **Status**: Remediation Applied in `env.ts` & `docker-compose.yml`

### Security Enforcement Controls
1. **Zod `superRefine` Startup Rejection**: [`backend/src/config/env.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/config/env.ts) implements strict runtime validation when `NODE_ENV === "production"`. It detects and rejects insecure development default secrets (`prod_access_secret_...`, `prod_refresh_secret_...`, `khademni_csrf_secret_...`, `recruitment_secure_pass_123`), forcing the application to immediately halt boot (`process.exit(1)`) if default secrets are passed in production.
2. **Docker Compose Hardcoded Secret Removal**: [`backend/docker-compose.yml`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/docker-compose.yml) has been updated to remove default hardcoded fallbacks for `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`, requiring explicit environment variable injection.

