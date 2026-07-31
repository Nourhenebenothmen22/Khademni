# Intelligent Teacher Recruitment Platform — Backend API

Production-grade, scalable, and secure RESTful backend service for an **Intelligent Teacher Recruitment Platform**, engineered with **Node.js 22, Express v5, TypeScript, Prisma ORM, PostgreSQL 16 (with pgvector), and an Isolated Hybrid AI Matching Engine**.

---

## Table of Contents

- [Overview](#overview)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Database & Prisma Setup](#database--prisma-setup)
- [API Documentation](#api-documentation)
- [AI Matching Engine Architecture](#ai-matching-engine-architecture)
- [Authentication & Security](#authentication--security)
- [Background Jobs, Queues & Caching](#background-jobs-queues--caching)
- [Development Workflow & Testing](#development-workflow--testing)
- [Docker Deployment](#docker-deployment)
- [Troubleshooting](#troubleshooting)
- [Future Roadmap](#future-roadmap)

---

## Overview

The **Intelligent Teacher Recruitment Platform Backend** provides a complete end-to-end recruitment pipeline tailored for educational institutions. It automates candidate intake, resume processing, state-machine application transitions, dynamic rule-based qualification screening, and vector-based semantic candidate ranking.

### Core Capabilities
- **Auth & Identity**: Role-based access control (ADMIN, CANDIDATE), Argon2 password hashing, dual JWT token rotation with breach defense, and Time-based One-Time Password (TOTP) 2FA.
- **Job & Requirement Management**: Published job listings with dynamic keywords (`REQUIRED`, `OPTIONAL`, `BONUS`) and custom rule criteria (`DEGREE`, `EXPERIENCE`, `CERTIFICATION`).
- **Candidate Application Pipeline**: Application intake, file streaming download, SHA-256 file checksum deduplication, and status state machine enforcing valid workflow transitions.
- **Dynamic Hybrid AI Matching Engine**: 100% database-driven matching engine combining rule-based deterministic scoring with dense vector cosine similarity (`pgvector` / TF-IDF). Zero hardcoded scoring rules or weights.
- **Asynchronous Background Processing**: Offloads heavy candidate batch ranking out of the HTTP lifecycle with real-time job status tracking.
- **Performance & Security**: Double Submit Cookie CSRF protection, hardened CORS origin validation, distributed rate limiting, and Redis read-through caching.

---

## Architecture & Tech Stack

```
                               ┌────────────────────────────────────────┐
                               │           Client / Frontend            │
                               └───────────────────┬────────────────────┘
                                                   │ HTTPS / REST API
                               ┌───────────────────▼────────────────────┐
                               │      Express v5 + Node.js 22 ESM       │
                               │ CORS | Helmet | CSRF | Rate-Limiting   │
                               └───────────────────┬────────────────────┘
                                                   │
        ┌──────────────────────────────────────────┼──────────────────────────────────────────┐
        │                                          │                                          │
┌───────▼────────┐                         ┌───────▼────────┐                         ┌───────▼────────┐
│ Modules Layer  │                         │  Hybrid AI     │                         │ Storage &      │
│ Auth, Jobs,    │                         │  Matching      │                         │ Caching        │
│ Applications,  │                         │  Engine        │                         │ PostgreSQL 16  │
│ Notifications  │                         │  (pgvector)    │                         │ (Redis / Disk) │
└────────────────┘                         └────────────────┘                         └────────────────┘
```

- **Runtime**: Node.js v22 (Native ES Modules / ESM)
- **Framework**: Express v5
- **Language**: TypeScript v5 (Strict Mode)
- **Database ORM**: Prisma v7 (`@prisma/client`) with PostgreSQL 16
- **Vector Search Engine**: PostgreSQL `pgvector` HNSW index
- **Authentication**: Argon2 (`hash` / `verify`), Jose (JWT), Otplib (TOTP 2FA)
- **Validation**: Zod schema validation
- **Documentation**: Swagger UI & Zod-OpenAPI (`/docs`)
- **Logging**: Pino structured logger (`pino-http`)
- **File Uploads**: Multer disk-storage streaming

---

## Project Structure

```text
apps/backend/
├── prisma/
│   ├── schema.prisma              # PostgreSQL 16 Prisma Schema (16 Models)
│   └── migrations/                # SQL Database Migrations
├── scripts/
│   ├── integration-test.ts        # Comprehensive E2E Integration Test Suite
│   └── generate-openapi.ts        # OpenAPI JSON Spec Generator
├── src/
│   ├── app.ts                     # Express App Initialization & Middleware Stack
│   ├── index.ts                   # Server Listener & Graceful Shutdown
│   ├── config/                    # Environment, Swagger & Zod-OpenAPI Config
│   ├── lib/                       # Core Infrastructure Services
│   │   ├── audit.ts               # Non-blocking DB Audit Logger
│   │   ├── cache.ts               # Redis / Memory Read-Through Caching
│   │   ├── email.ts               # Nodemailer Service (Verification, Status Updates)
│   │   ├── file-storage.ts        # Path-Traversal Safe Disk Storage Service
│   │   ├── jwt.ts                 # Dual JWT Access & Refresh Token Signer/Verifier
│   │   ├── logger.ts              # Pino Logger
│   │   ├── password.ts            # Argon2 Hashing Utilities
│   │   ├── prisma.ts              # Prisma Client Instance
│   │   ├── secrets.ts             # Secret Management Abstraction (AWS/Vault)
│   │   └── token.ts               # Token Generation & Hashing Utilities
│   ├── common/                    # Shared Cross-Cutting Concerns
│   │   ├── errors/                # AppError Custom Exception Class
│   │   ├── middlewares/           # Auth, Security, CSRF, Rate-Limit, Upload, Error
│   │   ├── utils/                 # Async Wrapper & Helpers
│   │   └── validators/            # Zod Validation Schemas for All Modules
│   └── modules/                   # Domain Modules (Clean Architecture)
│       ├── admin/                 # Admin Dashboard Stats & User Management
│       ├── ai-models/             # AI Matching Models & Performance Metrics
│       ├── applications/          # Applications State Machine & File Intake
│       ├── auth/                  # Register, Login, MFA, Password Reset, Refresh
│       ├── jobs/                  # Job Post CRUD, Keywords & Matching Rules
│       ├── matching/              # Hybrid Matching Engine, Queue & Vector Providers
│       ├── notifications/         # Candidate In-App Notification System
│       └── users/                 # Profile & User Queries
├── .env.example                   # Environment Variables Template
├── docker-compose.yml             # Local Development Infrastructure Stack
├── Dockerfile                     # Multi-stage Containerization Build File
├── openapi.json                   # Generated OpenAPI 3.0 Document
└── package.json                   # Dependencies & Package Scripts
```

---

## Installation & Setup

### Prerequisites
- **Node.js**: v22.0.0 or higher
- **PostgreSQL**: v16 with `pgvector` extension (or Docker Compose)
- **npm**: v10.0.0 or higher

### Local Installation Steps

1. **Clone Repository & Navigate to Backend**:
   ```bash
   cd "c:\full_stack projects\intelligent-teacher-recruitment-platform\apps\backend"
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

4. **Start PostgreSQL Database (Docker Compose)**:
   ```bash
   docker-compose up -d db
   ```

5. **Run Prisma Migrations & Generate Client**:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

6. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The backend server will start at `http://localhost:3000`.

---

## Environment Variables

Configured via `src/config/env.ts` with strict Zod parsing:

| Variable | Type | Default | Description |
|---|---|---|---|
| `NODE_ENV` | string | `development` | Environment (`development`, `production`, `test`) |
| `PORT` | number | `3000` | HTTP Server Listener Port |
| `CORS_ORIGIN` | string | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed CORS origins |
| `DATABASE_URL` | string | *Required* | PostgreSQL Connection String |
| `JWT_ACCESS_SECRET` | string | *Required (min 32 chars)* | Secret Key for Signing Access Tokens |
| `JWT_REFRESH_SECRET` | string | *Required (min 32 chars)* | Secret Key for Signing Refresh Tokens |
| `REDIS_URL` | string | *Optional* | Redis Connection URL for Distributed Rate Limiting & Caching |
| `SECRETS_PROVIDER` | string | `env` | Secret provider (`env`, `aws`, `vault`) |
| `CSRF_SECRET` | string | `khademni_csrf_secret_token_key_32chars` | CSRF Token Encryption Key |
| `SMTP_HOST` | string | *Optional* | SMTP Server Hostname (emails logged to console if unset) |
| `SMTP_PORT` | number | `587` | SMTP Port |
| `SMTP_USER` | string | *Optional* | SMTP Authentication User |
| `SMTP_PASS` | string | *Optional* | SMTP Authentication Password |
| `UPLOAD_DIR` | string | `./uploads` | Persistent Disk Storage Directory for Uploaded Files |

---

## Database & Prisma Setup

The platform uses PostgreSQL 16 with **16 Prisma schema models**:

- **`User`**: User accounts (ADMIN / CANDIDATE), lockout, TOTP secrets.
- **`AuthSession`**: Active refresh token sessions with rotation tracking.
- **`JobPost`**: Job posts, status (`DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`).
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
- **`AuditLog`**: Non-blocking system audit logs.
- **`Notification`**: Candidate in-app notifications.

### Database Commands
- **Sync Schema**: `npx prisma db push`
- **Open Prisma Studio**: `npx prisma studio`
- **Generate Client**: `npx prisma generate`

---

## API Documentation

Interactive Swagger API Documentation is served at:
- **Swagger UI**: `http://localhost:3000/docs`
- **OpenAPI JSON Spec**: `http://localhost:3000/docs.json`

### Key Endpoints

#### Authentication (`/api/v1/auth`)
- `GET  /csrf` — Obtain a Double Submit CSRF token cookie.
- `POST /register` — Register a new Candidate account.
- `POST /login` — Log in with password (returns MFA challenge if enabled).
- `POST /mfa/setup` — Generate TOTP QR code/secret (Authenticated).
- `POST /mfa/verify` — Enable TOTP 2FA on account.
- `POST /mfa/login` — Log in with TOTP 2FA code.
- `POST /refresh` — Rotate access/refresh token pair (Breach detection active).
- `POST /forgot-password` — Request password reset email token.
- `POST /reset-password` — Complete password reset.

#### Job Postings (`/api/v1/jobs`)
- `GET  /` — List job posts (Supports search, status filter, pagination).
- `GET  /:id` — Get single job post details.
- `POST /` — Create a new job post (ADMIN).
- `PUT  /:id` — Update job post / change status (ADMIN).
- `POST /:jobPostId/keywords` — Manage job keywords (ADMIN).
- `POST /:jobPostId/rules` — Manage job matching rules (ADMIN).

#### Applications (`/api/v1/applications`)
- `POST /jobs/:jobId/apply` — Candidate CV file upload intake.
- `GET  /` — List applications (Candidate / Admin).
- `PATCH /:id/status` — Transition application status state machine.
- `GET  /:id/documents/:docId/download` — Stream resume file from disk.

#### AI Matching Engine (`/api/v1/matching`)
- `POST /run` — Execute synchronous hybrid AI matching for single application (ADMIN).
- `POST /queue-job/:jobPostId` — Enqueue asynchronous background batch matching job (ADMIN).
- `GET  /queue-status/:queueJobId` — Check status & progress of background matching job.
- `GET  /scores/:applicationId` — Fetch candidate score breakdown.

---

## AI Matching Engine Architecture

```
                                ┌──────────────────────────────────────┐
                                │     Candidate CV + Motivation Text   │
                                └──────────────────┬───────────────────┘
                                                   │
                         ┌─────────────────────────┴─────────────────────────┐
                         │                                                   │
              ┌──────────▼──────────┐                             ┌──────────▼──────────┐
              │   Phase 1 Engine    │                             │  Phase 2 & 3 Engine │
              │ Dynamic Keywords    │                             │ PgVector 128-d      │
              │ & Condition Rules   │                             │ Dense Vector Cosine │
              └──────────┬──────────┘                             └──────────┬──────────┘
                         │                                                   │
                         └─────────────────────────┬─────────────────────────┘
                                                   │
                                ┌──────────────────▼───────────────────┐
                                │          Hybrid Formula             │
                                │ S = w_rule*S_rule + w_sem*S_semantic │
                                └──────────────────┬───────────────────┘
                                                   │
                                ┌──────────────────▼───────────────────┐
                                │  Final Candidate Score & Breakdown   │
                                └──────────────────────────────────────┘
```

1. **Dynamic Hyperparameters**:
   All scoring weights, keyword multipliers (`REQUIRED: 3.0`, `OPTIONAL: 1.0`, `BONUS: 0.5`), and degree hierarchies are loaded dynamically from `AIMatchingModel.hyperparameters`. Zero hardcoded rules in source code.

2. **Provider-Independent Semantic Layer**:
   Uses the `ISemanticProvider` contract interface. Defaults to `PgVectorSemanticProvider` for dense normalized vector similarity, with seamless fallback to `TfidfSemanticProvider`.

3. **Hybrid Ranking Formula**:
   $$S_{final} = w_{rule} \cdot S_{rule} + w_{semantic} \cdot S_{semantic}$$

---

## Authentication & Security

- **Password Hashing**: Argon2id with random salt buffers.
- **Refresh Token Breach Defense**: If an old refresh token is reused after rotation, all active sessions for that user are immediately revoked.
- **Multi-Factor Auth (MFA)**: TOTP 2FA via Google Authenticator / Authy (`otplib`).
- **CSRF Protection**: Double Submit Cookie protection (`verifyCsrf`). Stateless Bearer token requests pass through cleanly.
- **Rate Limiting**: Rate limiters for global, auth, login, registration, and file uploads. Integrates with Redis when `REDIS_URL` is set.
- **Security Headers**: Enforced via Helmet (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`).

---

## Background Jobs, Queues & Caching

- **Async Matching Queue (`matching-queue.service.ts`)**: Heavy candidate matching operations run asynchronously in background workers, returning an immediate `202 Accepted` status to prevent HTTP request timeouts.
- **Read-Through Caching (`cache.ts`)**: Frequently accessed published job lists (`jobs:published_list`) and active AI model configurations (`ai_models:active_model`) are cached in Redis / memory with 1-hour TTLs.
- **Automatic Invalidation**: `createJobPost()`, `updateJobPost()`, `createModel()`, and `updateModel()` automatically invalidate affected cache keys.

---

## Development Workflow & Testing

### Running Tests
Execute the complete end-to-end integration test suite against PostgreSQL:

```bash
npx tsx scripts/integration-test.ts
```

Verifies:
1. CSRF token issuance.
2. Candidate registration & login.
3. Password reset request flow.
4. TOTP MFA setup, verification, and MFA login.
5. Token rotation and stolen refresh token breach defense.
6. Job post creation, keyword configuration, matching rule setup, and publication.
7. Candidate application intake and file streaming downloads.
8. Hybrid AI matching engine execution & score breakdown.
9. Asynchronous AI matching queue submission & status polling.
10. AI model performance evaluations and metric recording.
11. Application status state machine transitions & notification delivery.
12. Admin dashboard statistics aggregation.

---

## Docker Deployment

### Local Docker Compose
To start PostgreSQL and the backend API service in Docker containers:

```bash
docker-compose up --build
```

### Multi-Stage Dockerfile
Build production container image:

```bash
docker build -t khademni-backend:latest .
docker run -p 3000:3000 --env-file .env khademni-backend:latest
```

---

## Troubleshooting

### Issue: "Invalid environment variables" on startup
- **Solution**: Ensure all required keys (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) are defined in `.env` and meet length constraints (secrets must be $\ge 32$ characters).

### Issue: "Database connection failed"
- **Solution**: Verify PostgreSQL is running on port 5432 and `DATABASE_URL` matches your local credentials. Run `npx prisma db push` to verify connection.

---

## Future Roadmap

1. **Web Frontend Client**: Build a modern React/Next.js web application for candidates and school recruiters.
2. **Multi-Tenancy**: Introduce `organizationId` isolation for multi-school SaaS deployments.
3. **Local ONNX Neural Transformer**: Integrate local ONNX transformer embeddings (`all-MiniLM-L6-v2`) for deep 384-dimensional semantic text representations.
