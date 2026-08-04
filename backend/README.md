# Intelligent Teacher Recruitment Platform — Backend API

Production-ready, scalable, and secure RESTful backend service for an **Intelligent Teacher Recruitment Platform**, built with **Node.js 22, Express v5, TypeScript, Prisma ORM, PostgreSQL 16, Redis, and a Hybrid AI Candidate-Matching Engine**.

---

## Table of Contents

- [Overview](#overview)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Local Setup](#installation--local-setup)
- [Environment Variables](#environment-variables)
- [Database Setup & Migrations](#database-setup--migrations)
- [Database Seeding](#database-seeding)
- [Redis Requirements & Usage](#redis-requirements--usage)
- [Development & Production Commands](#development--production-commands)
- [Testing & Validation Commands](#testing--validation-commands)
- [API & OpenAPI Documentation](#api--openapi-documentation)
- [Multi-Tenancy Isolation (`requireTenantAccess`)](#multi-tenancy-isolation-requiretenantaccess)
- [Security Features](#security-features)
- [Docker & Production Deployment](#docker--production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

The **Intelligent Teacher Recruitment Platform Backend** provides a multi-tenant recruitment pipeline for educational institutions. It automates candidate intake, PDF CV resume parsing, application status state-machine transitions, rule-based qualification screening, and hybrid AI-powered candidate scoring.

### Core Capabilities
- **Auth & Identity**: Role-based access control (`ADMIN`, `CANDIDATE`), Argon2 password hashing, dual JWT rotation with breach defense, and Time-based One-Time Password (TOTP 2FA via `otplib`).
- **Multi-Tenant Isolation**: Enforces tenant organization boundaries via `requireTenantAccess` middleware and `organizationId` claims with automatic `CROSS_TENANT_ACCESS_ATTEMPT` audit logging.
- **Job & Requirement Management**: Job listings with status transitions (`DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`), weighted keywords (`REQUIRED`, `OPTIONAL`, `BONUS`), and rule criteria (`DEGREE`, `EXPERIENCE`, `CERTIFICATION`, `CUSTOM`).
- **Candidate CV Intake & Parsing**: File streaming upload with Multer, path-traversal disk storage security, SHA-256 document checksum deduplication, and PDF text extraction via `pdf-parse`.
- **Hybrid AI Matching Engine**: Composite candidate scoring engine combining keyword matching, deterministic rule criteria evaluation, and TF-IDF cosine similarity term vectorization.
- **Asynchronous Processing & Redis State**: Asynchronous matching queue with Redis job state persistence (`matching_job:<id>` keys with 24h TTL) and in-memory fallback.
- **Security & Rate Limiting**: Double Submit Cookie CSRF protection with `crypto.timingSafeEqual()`, 7 granular Redis-backed rate limiters (`rate-limit-redis`), Helmet headers, log redaction, and startup production secret enforcement.

---

## Architecture & Tech Stack

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Client / Web Browser                             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / REST API (/api/v1/*)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                        Express v5 + Node.js 22 (ESM)                        │
│ CORS | Helmet | Pino Redaction | CSRF timingSafeEqual | Rate Limiters       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
      ┌────────────────────────────────┼────────────────────────────────┐
      │                                │                                │
┌─────▼──────────────┐       ┌─────────▼──────────┐           ┌─────────▼──────────┐
│ Feature Modules    │       │ Hybrid AI Engine   │           │ Data Persistence   │
│ Auth, Users, Jobs, │       │ Document Parser,   │           │ PostgreSQL 16      │
│ Applications, Admin│       │ TF-IDF Vectorizer, │           │ Redis (Store/Queue)│
│ Notifications      │       │ Matching Queue     │           │ Local Disk Storage │
└────────────────────┘       └────────────────────┘           └────────────────────┘
```

- **Runtime**: Node.js v22 (Native ES Modules / ESM)
- **Framework**: Express v5
- **Language**: TypeScript v5 (Strict Mode)
- **Database ORM**: Prisma ORM v7 (`@prisma/client`) with PostgreSQL 16
- **Cache & Key-Value Store**: Redis (via `ioredis` and `rate-limit-redis`)
- **Document Extraction**: `pdf-parse` (v1.1.1)
- **Authentication**: Argon2 (`hash` / `verify`), Jose (`SignJWT` / `jwtVerify`), Otplib (`totp`)
- **Validation**: Zod runtime validation schemas & `@asteasolutions/zod-to-openapi`
- **Documentation**: Swagger UI & Zod-OpenAPI (`/docs` & `openapi.json`)
- **Logging**: Pino structured logger (`pino-http`)
- **File Uploads**: Multer disk-storage streaming

---

## Project Structure

```text
backend/
├── prisma/
│   ├── schema.prisma              # PostgreSQL 16 Prisma Schema (16 Models)
│   ├── seed.ts                    # Database Seed Script (Argon2 Hashed Admin & Seed Data)
│   └── migrations/                # SQL Database Migrations (e.g., 20260804200000_add_organization_and_notifications)
├── scripts/
│   ├── integration-test.ts        # Comprehensive E2E Integration Test Suite
│   └── generate-openapi.ts        # OpenAPI 3.0 JSON Spec Generator
├── src/
│   ├── app.ts                     # Express App Initialization & 9-Step Middleware Stack
│   ├── index.ts                   # Server Listener & Graceful Shutdown
│   ├── config/                    # Environment, Swagger & Zod-OpenAPI Config
│   │   ├── env.ts                 # Zod Environment Validation & Production Secret Enforcement
│   │   ├── swagger.ts             # OpenAPI Route Registrations
│   │   └── zod-openapi.ts         # Zod OpenAPI Registry
│   ├── lib/                       # Core Infrastructure Services
│   │   ├── audit.ts               # Non-blocking Database Audit Logger
│   │   ├── cache.ts               # TTL Caching Utilities
│   │   ├── email.ts               # Email Service (Status Updates & Verification)
│   │   ├── file-storage.ts        # Path-Traversal Safe Disk Storage Service
│   │   ├── jwt.ts                 # Dual JWT Access & Refresh Token Signer/Verifier
│   │   ├── logger.ts              # Pino Logger Singleton
│   │   ├── password.ts            # Argon2 Hashing Utilities
│   │   ├── prisma.ts              # Prisma Client Instance & Slow Query Logging
│   │   ├── redis.ts               # Redis Client Singleton (ioredis) with Fallback Logging
│   │   ├── secrets.ts             # Secret Management Abstraction (env/aws/vault)
│   │   └── token.ts               # SHA-256 Token Digest Helpers
│   ├── common/                    # Shared Cross-Cutting Concerns
│   │   ├── errors/                # AppError Custom Exception Class
│   │   ├── middlewares/           # Auth, Tenant, Security, CSRF, Rate-Limit, Upload, Error
│   │   ├── utils/                 # Async Wrapper & Helpers
│   │   └── validators/            # Zod Validation Schemas for All Modules
│   └── modules/                   # Domain Modules (Clean Layered Architecture)
│       ├── admin/                 # Admin Dashboard Stats & User Management
│       ├── ai-models/             # AI Matching Models & Metric Tracking
│       ├── applications/          # Applications State Machine & Document Download
│       ├── auth/                  # Register, Login, MFA, Password Reset, Refresh
│       ├── jobs/                  # Job Post CRUD, Keywords & Matching Rules
│       ├── matching/              # Hybrid Matching Engine, Queue & CV Text Parser
│       ├── notifications/         # Candidate In-App Notification System
│       └── users/                 # Profile & User Operations
├── docker-compose.yml             # Containerized Local Infrastructure Stack (PostgreSQL)
├── Dockerfile                     # Multi-stage Containerization Build File
├── openapi.json                   # Generated OpenAPI 3.0 Document
└── package.json                   # Project Dependencies & Package Scripts
```

---

## Prerequisites

Before setting up the backend, ensure you have installed:
- **Node.js**: v22.0.0 or higher
- **npm**: v10.0.0 or higher
- **PostgreSQL**: v16 or higher (or Docker)
- **Redis**: v7 or higher (Optional; in-memory fallback active when unconfigured)

---

## Installation & Local Setup

1. **Navigate to the Backend Directory**:
   ```bash
   cd backend
   ```

2. **Install Package Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a local `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. **Start PostgreSQL Container (Docker Compose)**:
   ```bash
   docker-compose up -d db
   ```

5. **Execute Database Migrations & Generate Prisma Client**:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

6. **Seed Initial Database Data**:
   ```bash
   npx prisma db seed
   ```

7. **Generate OpenAPI Document**:
   ```bash
   npm run openapi:generate
   ```

8. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The backend API will start at `http://localhost:3000`.

---

## Environment Variables

All environment variables are validated at startup via `src/config/env.ts` using Zod.

| Key | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development \| production \| test` | `development` | Deployment environment state |
| `PORT` | `number` | `3000` | HTTP server listening port |
| `LOG_LEVEL` | `fatal \| error \| warn \| info \| debug \| trace` | `info` | Pino structured log level |
| `CORS_ORIGIN` | `string` | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed CORS origins |
| `SLOW_QUERY_THRESHOLD_MS` | `number` | `300` | Prisma slow query warning threshold (ms) |
| `DATABASE_URL` | `string` (URL) | *Required* | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | `string` ($\ge 32$ chars) | *Required* | Secret key for signing JWT access tokens |
| `JWT_REFRESH_SECRET` | `string` ($\ge 32$ chars) | *Required* | Secret key for signing JWT refresh tokens |
| `REDIS_URL` | `string` (optional) | — | Redis URL for distributed rate limiting & queues |
| `SECRETS_PROVIDER` | `env \| aws \| vault` | `env` | Secret manager driver provider |
| `CSRF_SECRET` | `string` | `khademni_csrf_secret_token_key_32chars` | Encryption key for CSRF double submit tokens |
| `SMTP_HOST` | `string` (optional) | — | SMTP mail server hostname |
| `SMTP_PORT` | `number` | `587` | SMTP mail server port |
| `SMTP_USER` | `string` (optional) | — | SMTP mail authentication username |
| `SMTP_PASS` | `string` (optional) | — | SMTP mail authentication password |
| `SMTP_FROM` | `string` | `Khademni <noreply@khademni.com>` | Outgoing email sender address |
| `UPLOAD_DIR` | `string` | `./uploads` | Local filesystem storage path for uploaded CVs |
| `APP_URL` | `string` | `http://localhost:3000` | Backend application base URL |
| `FRONTEND_URL` | `string` | `http://localhost:5173` | Frontend application base URL |

> [!IMPORTANT]
> **Production Secret Enforcement**: When `NODE_ENV === "production"`, `env.ts` enforces `superRefine()` checks that reject default development secret values (`prod_access_secret_...`, `prod_refresh_secret_...`, `khademni_csrf_secret_...`). The process will immediately halt (`process.exit(1)`) if default development secrets are detected in production.

---

## Database Setup & Migrations

The database layer utilizes PostgreSQL 16 with **16 Prisma schema models**:

- **`Organization`**: Tenant organization entity.
- **`User`**: User accounts (`ADMIN` / `CANDIDATE`), lockout state, TOTP secrets, `organizationId` foreign key.
- **`AuthSession`**: Active refresh token sessions with rotation tracking.
- **`JobPost`**: Job postings, status (`DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`), `organizationId` foreign key.
- **`JobKeyword`**: Weighted job keywords (`REQUIRED`, `OPTIONAL`, `BONUS`).
- **`JobMatchingRule`**: Dynamic matching rules (`DEGREE`, `EXPERIENCE`, `CERTIFICATION`, `CUSTOM`).
- **`Application`**: Candidate job applications and tracking codes.
- **`ApplicationDocument`**: Document metadata, storage key, SHA-256 checksum.
- **`DocumentParseResult`**: Extracted text content and structured metadata.
- **`AIMatchingModel`**: Dynamic model hyperparameters and activation state.
- **`AIMatchingModelEvaluation`**: Performance evaluation run datasets.
- **`AIMatchingMetric`**: Evaluation metrics (`PRECISION`, `RECALL`, `F1_SCORE`, `NDCG_AT_5`, `MAP`).
- **`MatchingRun`**: Execution record storing total scores, keyword matches, and rule breakdowns.
- **`ApplicationScore`**: Candidate final recommendation (`HIGHLY_RECOMMENDED`, `RECOMMENDED`, `AVERAGE`, `NOT_RECOMMENDED`).
- **`ApplicationStatusHistory`**: Audit trail of application status changes.
- **`AuditLog`**: Non-blocking system audit logs with indexes on `action` and `(entityType, entityId)`.
- **`Notification`**: Candidate in-app notifications.

### Database Migration Commands
```bash
# Apply pending SQL migrations to PostgreSQL (Production/Staging)
npx prisma migrate deploy

# Create a new migration during local development
npx prisma migrate dev --name <migration_name>

# Regenerate Prisma Client TypeScript types
npx prisma generate

# Launch Prisma Studio web GUI
npx prisma studio
```

---

## Database Seeding

The seed script ([`prisma/seed.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/prisma/seed.ts)) populates initial seed data:
- Default `Organization` ("Ministry of Education")
- Default `ADMIN` user (`admin@khademni.com` / `AdminPass123!`) with Argon2 password hashing
- Sample `CANDIDATE` users, job posts, keywords, and matching rules

Run the seed command:
```bash
npx prisma db seed
```

---

## Redis Requirements & Usage

Redis is integrated via a centralized `ioredis` client ([`src/lib/redis.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/redis.ts)).

### Uses of Redis
1. **Distributed Rate Limiting**: All 7 rate limiters (`globalRateLimiter`, `authRateLimiter`, `authLoginRateLimiter`, `authRegisterRateLimiter`, `authRefreshRateLimiter`, `authMfaRateLimiter`, `uploadRateLimiter`) use `rate-limit-redis` to share request counters across multiple backend instances.
2. **Matching Queue State Persistence**: The background matching queue ([`matching-queue.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/matching/matching-queue.service.ts)) persists async job status (`matching_job:<id>`) to Redis with a 24-hour TTL.

> [!NOTE]
> **Graceful Fallback**: If `REDIS_URL` is unconfigured or Redis is temporarily unreachable, `redis.ts` catches connection errors on boot and seamlessly falls back to in-memory V8 `Map` storage without crashing the process.

---

## Development & Production Commands

| Script Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start development server with hot-reload (`tsx watch src/index.ts`) |
| `npm run build` | Compile TypeScript source code to `./dist` (`tsc`) |
| `npm start` | Run compiled production build (`node dist/index.js`) |
| `npm run typecheck` | Perform static type checking (`tsc --noEmit`) |
| `npm run test` | Run complete end-to-end integration test suite (`tsx scripts/integration-test.ts`) |
| `npm run openapi:generate` | Generate updated `openapi.json` from Zod routes (`tsx scripts/generate-openapi.ts`) |
| `npx prisma db seed` | Execute database seeding (`ts-node prisma/seed.ts`) |

---

## Testing & Validation Commands

Execute the automated end-to-end integration test suite against PostgreSQL:

```bash
npm run test
```

### Verified Test Coverage
1. CSRF token issuance & Double Submit Cookie verification.
2. Candidate registration, password hashing & authentication.
3. Password reset token generation & completion flow.
4. TOTP MFA secret generation, QR code setup, verification, and MFA login.
5. Token pair rotation and stolen refresh token breach defense.
6. Job post creation, keyword configuration, matching rule setup, and publication.
7. Candidate application submission, PDF file parsing (`pdf-parse`), and streaming document download.
8. Hybrid AI matching engine execution & score breakdown.
9. Asynchronous AI matching queue submission & status polling.
10. AI model performance evaluation & metric recording.
11. State-machine status transitions & in-app notification creation.
12. Multi-tenant access controls & admin dashboard statistics aggregation.

---

## API & OpenAPI Documentation

Interactive Swagger API documentation is served automatically on boot:
- **Swagger UI**: [`http://localhost:3000/docs`](http://localhost:3000/docs)
- **OpenAPI JSON Spec**: [`http://localhost:3000/docs.json`](http://localhost:3000/docs.json)

### Key Endpoint Groups

#### Auth (`/api/v1/auth`)
- `GET /csrf` — Obtain CSRF token cookie.
- `POST /register` — Register Candidate account.
- `POST /login` — Authenticate user (returns MFA token if MFA active).
- `POST /mfa/setup` — Generate TOTP QR code & secret.
- `POST /mfa/verify` — Enable TOTP 2FA.
- `POST /mfa/login` — Complete login with 6-digit TOTP code.
- `POST /refresh` — Rotate access & refresh token pair.
- `POST /forgot-password` — Request password reset email token.
- `POST /reset-password` — Complete password reset.

#### Job Postings (`/api/v1/jobs`)
- `GET /` — Search published jobs (Query filters: `search`, `status`, `page`, `limit`).
- `GET /:id` — Get job details.
- `POST /` — Create job post (`ADMIN`, `requireTenantAccess`).
- `PUT /:id` — Update job post (`ADMIN`, `requireTenantAccess`).
- `POST /:jobPostId/keywords` — Add weighted job keywords (`ADMIN`, `requireTenantAccess`).
- `POST /:jobPostId/rules` — Add job matching rules (`ADMIN`, `requireTenantAccess`).

#### Applications (`/api/v1/applications`)
- `POST /jobs/:jobId/apply` — Candidate CV file upload intake (`uploadRateLimiter`).
- `GET /` — List applications (`ADMIN`, `requireTenantAccess`).
- `GET /me` — Candidate application history.
- `PATCH /:id/status` — State-machine status transition (`ADMIN`, `requireTenantAccess`).
- `GET /:id/documents/:docId/download` — Stream resume file from disk storage.

#### AI Matching (`/api/v1/matching`)
- `POST /run` — Synchronous candidate evaluation (`ADMIN`, `requireTenantAccess`).
- `POST /queue-job/:jobPostId` — Enqueue asynchronous background matching job (`ADMIN`, `requireTenantAccess`).
- `GET /queue-status/:queueJobId` — Poll status of background matching job.
- `GET /scores/:applicationId` — Retrieve candidate score breakdown.

---

## Multi-Tenancy Isolation (`requireTenantAccess`)

Multi-tenant security is enforced via the `requireTenantAccess` middleware ([`src/common/middlewares/tenant.middleware.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/middlewares/tenant.middleware.ts)).

### Execution Sequence
$$\text{Client Request} \longrightarrow \text{authenticate} \longrightarrow \text{requireTenantAccess} \longrightarrow \text{requireRole("ADMIN")} \longrightarrow \text{Controller}$$

1. **Parameter Resolution**: Resolves the target organization ID from `req.params.organizationId`, `req.params.orgId`, `req.query.organizationId`, `req.query.orgId`, `req.headers["x-organization-id"]`, or `req.headers["x-tenant-id"]`.
2. **Server-Side Identity Verification**: Compares the requested organization ID against `req.user.organizationId` (extracted from the cryptographically verified JWT payload).
3. **Violation Handling & Audit Logging**: Returns `403 Forbidden` on mismatch and writes an explicit `CROSS_TENANT_ACCESS_ATTEMPT` entry to the `AuditLog` table containing user ID, requested organization ID, HTTP path, method, IP address, and user agent.

---

## Security Features

- **Password Hashing**: Argon2id with random salt buffers (`password.ts`).
- **Refresh Token Breach Defense**: If an old refresh token is reused after rotation, all active sessions for that user are immediately revoked (`AuthSession`).
- **Multi-Factor Auth (MFA)**: TOTP 2FA via Google Authenticator / Authy (`otplib`).
- **CSRF Protection**: Double Submit Cookie protection (`verifyCsrf`) using constant-time `crypto.timingSafeEqual()` validation.
- **Granular Rate Limiting**: 7 Redis-backed rate limiters (`rate-limit.middleware.ts`).
- **Security Headers & Logging Privacy**: Enforced via Helmet and Pino header redaction (`Authorization`, `Cookie`, `X-CSRF-Token`).
- **Path Traversal Protection**: Directory boundary sanitization in file storage (`file-storage.ts`).
- **Production Secret Validation**: Startup `superRefine()` checks rejecting default secrets when `NODE_ENV === "production"`.

---

## Docker & Production Deployment

### 1. Local Docker Compose Stack
Start PostgreSQL and the API service:
```bash
docker-compose up --build
```

### 2. Multi-Stage Production Docker Build
The Dockerfile uses a 3-stage build (`deps` $\rightarrow$ `builder` $\rightarrow$ `runner`):

```bash
# Build production image
docker build -t khademni-backend:latest .

# Run production container with environment file
docker run -p 3000:3000 --env-file .env khademni-backend:latest
```

---

## Troubleshooting

### 1. Startup Error: "Invalid environment variables" / "Insecure secret key"
- **Cause**: One or more required environment variables (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) are missing or do not meet length constraints ($\ge 32$ characters). In production mode, using default development secret strings triggers startup rejection.
- **Solution**: Provide explicit production secrets in `.env` or container environment.

### 2. Database Connection Error
- **Cause**: PostgreSQL is not reachable on the host/port specified in `DATABASE_URL`.
- **Solution**: Ensure PostgreSQL is running (`docker-compose up -d db`) and execute `npx prisma migrate deploy`.

### 3. Redis Fallback Warning in Logs
- **Cause**: `REDIS_URL` is not defined or Redis server is offline.
- **Solution**: This is expected behavior during local offline development; the application automatically falls back to in-memory storage. For production, set `REDIS_URL=redis://redis_host:6379`.
