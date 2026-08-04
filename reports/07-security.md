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
- **Mechanism**: Extracts the requested organization ID from `req.params.organizationId`, `req.query.organizationId`, or `req.headers['x-organization-id']` and compares it against the authenticated user's `organizationId`. Returns 403 Forbidden on cross-tenant access attempts.
- **Current Usage**: The middleware is defined and exported but not currently attached to any route files. It is available for organization-scoped endpoint protection.

---

## 4. Multi-Factor Authentication (MFA / TOTP)

- **Library**: `otplib` (Time-based One-Time Password) & `qrcode`.
- **Workflow**: User enables MFA -> Server generates TOTP Secret (`authenticator.generateSecret()`) and QR code data URL -> User confirms initial TOTP code -> `mfaEnabled` flag set to `true` on User model.

---

## 5. Security Middleware & Defense-in-Depth

1. **Double Submit Cookie CSRF Protection**: Enforced via `verifyCsrf` ([csrf.middleware.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/middlewares/csrf.middleware.ts)) using constant-time `crypto.timingSafeEqual()` validation with non-empty buffer checks.
2. **Helmet HTTP Headers**: Enforces strict CSP, HSTS, frameguard, and disables `X-Powered-By`.
3. **Pino Header Redaction**: Redacts `Authorization`, `Cookie`, and `X-CSRF-Token` headers from application logs ([security.middleware.ts:L40](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/middlewares/security.middleware.ts#L40)).
4. **Input Sanitization & Type Enforcement**: All HTTP requests are parsed against strict Zod validation schemas.
5. **Path Traversal Protection**: File storage key resolver ([file-storage.ts:L13-L22](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/file-storage.ts#L13-L22)) sanitizes relative paths and enforces directory boundary checks.

---

## 6. Production Secret Enforcement & Docker Security

> **Status**: Remediation Applied in `env.ts` & `docker-compose.yml`

### Security Enforcement Controls
1. **Zod `superRefine` Startup Rejection**: [`backend/src/config/env.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/config/env.ts) implements strict runtime validation when `NODE_ENV === "production"`. It detects and rejects insecure development default secrets (`prod_access_secret_...`, `prod_refresh_secret_...`, `khademni_csrf_secret_...`, `recruitment_secure_pass_123`), forcing the application to immediately halt boot (`process.exit(1)`) if default secrets are passed in production.
2. **Docker Compose Hardcoded Secret Removal**: [`backend/docker-compose.yml`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/docker-compose.yml) has been updated to remove default hardcoded fallbacks for `POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`, requiring explicit environment variable injection.

