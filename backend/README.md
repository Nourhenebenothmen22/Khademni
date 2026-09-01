# Intelligent Teacher Recruitment Platform — Backend API

Production-ready, scalable, and secure RESTful backend service for the **Intelligent Teacher Recruitment Platform**, built with **Node.js 22, Express v5, TypeScript 5, Prisma ORM 7, PostgreSQL 16 (pgvector 384d), Redis 7, and an In-Process Explainable AI Candidate-Matching Engine**.

---

## Table of Contents

- [Overview & Capabilities](#overview--capabilities)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Project Directory Structure](#project-directory-structure)
- [Multi-Tenant Isolation & Authorization](#multi-tenant-isolation--authorization)
- [AI Semantic Matching & Vector Architecture](#ai-semantic-matching--vector-architecture)
- [Security Architecture & Remediations](#security-architecture--remediations)
- [Database Models (23 Prisma Models)](#database-models-23-prisma-models)
- [Environment Variables](#environment-variables)
- [Development & Production Commands](#development--production-commands)
- [Testing & Validation](#testing--validation)
- [OpenAPI 3.0 & Swagger UI](#openapi-30--swagger-ui)

---

## Overview & Capabilities

The **Intelligent Teacher Recruitment Platform Backend** provides a complete multi-tenant recruitment operating system for schools, universities, and educational institutions:

- **Identity & Role-Based Access Control**: Strict multi-tenant RBAC (`ORGANIZATION_ADMIN`, `CANDIDATE`), Argon2 password hashing, atomic JWT refresh rotation with breach defense, and TOTP 2FA (`otplib`).
- **Multi-Tenant Scoping**: `requireTenantAccess` middleware, tenant query filtering, composite multi-tenant database indexes, and dedicated `CandidateHybridIndex` tenant partitioning.
- **Candidate CV Ingestion Pipeline**: In-memory binary magic-byte inspection (`file-type`), path-traversal disk storage security, SHA-256 deduplication, text extraction via `pdf-parse`, and automatic 384-dimensional dense vector embedding generation.
- **Explainable Hybrid AI Matching Engine**: Multi-tiered scoring engine combining dense semantic vector cosine distance (`pgvector`), sparse lexical search (`tsvector`), Reciprocal Rank Fusion (RRF), rule-based qualification screening (degree hierarchy regex, date-merged experience years), and Cross-Attention reranking.
- **Structured Interview Scheduling & Evaluations**: Multi-provider interview coordination (`ZOOM`, `GOOGLE_MEET`, `MS_TEAMS`, `CUSTOM_LINK`), RFC 5545 iCalendar (`.ics`) generation with CRLF injection sanitization, panel interviewer assignments, and multi-criteria scorecards (`ScorecardCriteriaScore`).
- **Asynchronous Processing**: Redis 7 + BullMQ worker queue for background batch matching jobs with concurrency controls and progress tracking.

---

## Architecture & Tech Stack

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Client / Web Browser                             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / REST API (/api/v1/*)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                        Express v5 + Node.js 22 (ESM)                        │
│ CORS | Helmet | Pino Redaction | CSRF timingSafeEqual | Magic-Byte Upload   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       │                               │                               │
┌──────▼──────────────┐       ┌────────▼───────────┐          ┌────────▼───────────┐
│ Domain Modules      │       │ Hybrid AI Engine   │          │ Data Persistence   │
│ Auth, Users, Jobs,  │       │ Document Parser,   │          │ PostgreSQL 16      │
│ Applications, Admin,│       │ ONNX 384d Embedder,│          │ pgvector Extension │
│ Interviews, Orgs,   │       │ Hybrid RRF Search, │          │ Redis 7 (Auth/MQ)  │
│ Notifications       │       │ BullMQ Queue       │          │ Local Disk Storage │
└─────────────────────┘       └────────────────────┘          └────────────────────┘
```

- **Runtime**: Node.js v22 (Native ES Modules / ESM)
- **Framework**: Express v5
- **Language**: TypeScript v5 (Strict Mode)
- **Database ORM**: Prisma ORM v7 (`@prisma/client`) with PostgreSQL 16 & `pgvector`
- **Cache & Message Broker**: Redis 7 (`ioredis`, `rate-limit-redis`, BullMQ)
- **Document Text Extraction**: `pdf-parse` (v1.1.1)
- **AI Feature Extractor**: Local ONNX Runtime (`@xenova/transformers`, `Xenova/all-MiniLM-L6-v2`)
- **Authentication**: Argon2 (`hash` / `verify`), Jose (`SignJWT` / `jwtVerify`), Otplib (`totp`)
- **Validation**: Zod runtime validation schemas & `@asteasolutions/zod-to-openapi`
- **Logging**: Pino structured logger (`pino-http`) with PII redaction

---

## Project Directory Structure

```text
backend/
├── prisma/
│   ├── schema.prisma              # PostgreSQL 16 Prisma Schema (23 Models)
│   ├── seed.ts                    # Dynamic Seeding with Env-Configured Passwords
│   └── migrations/                # Versioned SQL Database Migrations
├── scripts/
│   ├── integration-test.ts        # Comprehensive E2E Integration Test Suite
│   ├── verify-smtp.ts             # Brevo SMTP Handshake Verification Script
│   └── generate-openapi.ts        # OpenAPI 3.0 JSON Spec Generator
├── src/
│   ├── app.ts                     # Express Application Initialization & Middleware
│   ├── index.ts                   # HTTP Listener & Graceful Shutdown Hooks
│   ├── config/                    # Environment, Swagger & Zod-OpenAPI Config
│   │   ├── env.ts                 # Strict Zod Environment Parser & SuperRefine Rules
│   │   ├── swagger.ts             # OpenAPI Route Registrations
│   │   └── zod-openapi.ts         # OpenAPI Registry Instance
│   ├── lib/                       # Core Infrastructure Singletons
│   │   ├── audit.ts               # Non-blocking Database Audit Logger
│   │   ├── email.ts               # Brevo SMTP Mail Service & Templates
│   │   ├── encryption.ts          # AES-256-GCM Column Encryption / Decryption
│   │   ├── file-storage.ts        # Safe Filesystem Storage Handlers
│   │   ├── jwt.ts                 # Access & Refresh Token Lifecycle
│   │   ├── logger.ts              # Pino Logger Singleton
│   │   ├── password.ts            # Argon2 Password Hashing Utilities
│   │   ├── prisma.ts              # Prisma Client Instance & Slow Query Logger
│   │   ├── redis.ts               # Redis Client Singleton (ioredis) with Password Auth
│   │   └── token.ts               # SHA-256 Token Digest Helpers
│   ├── common/                    # Cross-Cutting Concerns
│   │   ├── errors/                # AppError Exception Classes
│   │   ├── middlewares/           # Auth, Tenant, CSRF, Rate-Limit, Upload, Error
│   │   └── validators/            # Zod Validation Schemas for All Modules
│   └── modules/                   # Domain Modules
│       ├── admin/                 # Dashboard Analytics & User Management
│       ├── ai-models/             # AI Model Registry & Evaluation Metrics
│       ├── applications/          # Application Intake & Status State Machine
│       ├── auth/                  # Register, Login, MFA, Password Reset, Refresh
│       ├── interviews/            # Scheduling, RFC 5545 iCal, Scorecards & Webhooks
│       ├── jobs/                  # Job Post CRUD, Keywords & Matching Rules
│       ├── matching/              # Ingestion Parser, Hybrid Search, RRF & BullMQ Queue
│       ├── notifications/         # Candidate In-App Notification System
│       ├── organizations/         # Multi-Tenant Organization Profiles & Scoped Directory
│       └── users/                 # Profile, Avatar Media Streaming & Passwords
├── docker-compose.yml             # Hardened Backend Stack
├── Dockerfile                     # Multi-Stage Build Runner (Unprivileged node user)
└── package.json                   # Dependencies & Build Scripts
```

---

## Multi-Tenant Isolation & Authorization

Multi-tenancy is enforced at three distinct layers:

1. **Middleware Layer** (`requireTenantAccess`): Rejects cross-tenant requests and logs `CROSS_TENANT_ACCESS_ATTEMPT` audit records.
2. **Service Layer**: Every database query joins through `organizationId` (e.g. `where: { jobPost: { organizationId } }`).
3. **Vector Layer**: `candidate_hybrid_indexes` explicitly partitions dense vector embeddings and lexical indices by `organization_id` and `job_post_id`. The Hybrid RRF query filters by `organization_id` in all CTEs.

---

## AI Semantic Matching & Vector Architecture

```
[ Candidate CV / Job Post ]
            │
            ▼
[ Local ONNX Transformer: Xenova/all-MiniLM-L6-v2 ]
            │
            ▼ (384-dimensional dense float vector)
     ┌──────┴─────────────────────────────────┐
     ▼                                        ▼
[ PostgreSQL pgvector ]             [ PostgreSQL tsvector ]
(Dense Semantic Vector <=>)         (Sparse Lexical / BM25)
     │                                        │
     └──────────────────┬─────────────────────┘
                        ▼
          [ Reciprocal Rank Fusion (RRF) ]
                        │
                        ▼
      [ Cross-Attention Contextual Reranker ]
                        │
                        ▼
            [ Final AI Match Score % ]
```

- **Inference**: In-process local transformer (`@xenova/transformers`) with zero external API calls, latency spikes, or privacy leaks.
- **Fusion Formula**: $\text{RRF} = \frac{1}{60 + r_{\text{dense}}} + \frac{1}{60 + r_{\text{sparse}}}$.
- **Rule Engine**: Evaluates academic degree hierarchy (PhD, Master, Bachelor, High School) and calculates non-overlapping experience duration via date-interval union merging.

---

## Security Architecture & Remediations

All verified vulnerabilities have been remediated:

| Area | Security Implementation |
|---|---|
| **Multi-Tenant RBAC** | Strict role enforcement (`ORGANIZATION_ADMIN`, `CANDIDATE`) with `requireTenantAccess` organization isolation. |
| **SQL Injection Prevention** | All raw SQL statements use parameterized `prisma.$executeRaw(Prisma.sql\`...\`)`. Unsafe SQL string concatenation eliminated. |
| **File Upload Security** | In-memory binary magic-byte detection via `file-type` on uploaded buffers before disk writes. Client `Content-Type` headers discarded. |
| **JWT Session Integrity** | `refreshSession` re-queries the database inside an atomic transaction, validating `isActive === true` and minting tokens with live database roles. |
| **Sensitive Data Encryption** | AES-256-GCM authenticated encryption (`DATABASE_ENCRYPTION_KEY`) for TOTP secrets and provider credentials. |
| **Webhook Verification** | Brevo email webhook protected with HMAC-SHA256 signature verification and `crypto.timingSafeEqual`. |
| **Redis Authentication** | Redis password authentication enforced (`--requirepass ${REDIS_PASSWORD}`) with container network isolation. |
| **iCalendar CRLF Protection** | Carriage return (`\r`) sequences stripped in `escapeICSString` before `.ics` file formatting. |

---

## Database Models (23 Prisma Models)

1. `Organization` — Tenant institution profile
2. `User` — User accounts (`ORGANIZATION_ADMIN`, `CANDIDATE`), MFA secret
3. `AuthSession` — Active refresh token sessions with rotation tracking
4. `JobPost` — Job postings, status lifecycle, `vector(384)` embedding
5. `JobKeyword` — Weighted keywords (`REQUIRED`, `OPTIONAL`, `BONUS`)
6. `JobMatchingRule` — Hard rules (`DEGREE`, `EXPERIENCE`, `CERTIFICATION`, `CUSTOM`)
7. `Application` — Applications and tracking codes (`APP-XXXXXXXX`)
8. `ApplicationDocument` — Document metadata, storage keys, SHA-256 checksums
9. `DocumentParseResult` — Extracted text, structured data, `vector(384)` embedding
10. `AIMatchingModel` — Dynamic AI matching models and hyperparameters
11. `AIMatchingModelEvaluation` — Benchmark evaluation datasets
12. `AIMatchingMetric` — Benchmark metrics (Accuracy, Precision, Recall, F1, NDCG@5)
13. `MatchingRun` — Detailed execution record with rule and score breakdowns
14. `ApplicationScore` — Candidate final score and recommendation category
15. `ApplicationStatusHistory` — Audit log of application status transitions
16. `AuditLog` — Immutable platform audit trail
17. `Notification` — Candidate in-app notifications
18. `Interview` — Scheduled interview records
19. `InterviewerAssignment` — Assigned panel interviewers
20. `InterviewScorecard` — Post-interview evaluation scorecards
21. `ScorecardCriteriaScore` — Individual criteria rating scores
22. `OrganizationProviderConfig` — Tenant credentials for Zoom, Meet, Teams
23. `CandidateHybridIndex` — Partitioned dense vector and tsvector index table

---

## Environment Variables

| Variable | Type | Default Value | Description |
|---|---|---|---|
| `NODE_ENV` | enum | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | number | `3000` | HTTP listening port |
| `LOG_LEVEL` | enum | `info` | Structured logging level |
| `TRUST_PROXY` | string | `loopback` | Express trust proxy setting |
| `CORS_ORIGIN` | string | `http://localhost:5173,...` | Allowed CORS origins |
| `DATABASE_URL` | string (URL) | *Required* | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | string | *Required* ($\ge 32$ chars) | Access token signing secret |
| `JWT_REFRESH_SECRET` | string | *Required* ($\ge 32$ chars) | Refresh token signing secret |
| `CSRF_SECRET` | string | *Required* ($\ge 32$ chars) | Double Submit Cookie CSRF secret |
| `DATABASE_ENCRYPTION_KEY` | string | *Required in Prod* (64 hex) | AES-256-GCM encryption key |
| `BREVO_WEBHOOK_SECRET` | string | *Required in Prod* ($\ge 16$) | Webhook HMAC validation secret |
| `REDIS_URL` | string | `redis://localhost:6379` | Redis connection URL |
| `REDIS_PASSWORD` | string | *Required in Prod* ($\ge 16$) | Redis authentication password |
| `SMTP_HOST` | string | `smtp-relay.brevo.com` | Brevo SMTP relay host |
| `SMTP_PORT` | number | `587` | Brevo SMTP port |
| `SMTP_USER` | string | *Required in Prod* | Brevo SMTP account email |
| `SMTP_PASS` | string | *Required in Prod* | Brevo SMTP relay key |
| `SMTP_FROM` | string | `Khademni <noreply@...>` | Outgoing email sender |
| `UPLOAD_DIR` | string | `./uploads` | Local upload storage folder |
| `APP_URL` | string | `http://localhost:3000` | Backend base URL |
| `FRONTEND_URL` | string | `http://localhost:3001` | Frontend base URL |

---

## Development & Production Commands

```powershell
# Development server with hot-reload
npm run dev

# Compile TypeScript to dist/
npm run build

# Run production build
npm start

# Run unit tests and E2E integration test suite
npm test

# Generate Prisma Client
npx prisma generate

# Synchronize schema with database
npx prisma db push

# Seed default accounts
npm run db:seed

# Generate OpenAPI 3.0 JSON specification
npm run openapi:generate
```

---

## OpenAPI 3.0 & Swagger UI

- Interactive API Explorer: `http://localhost:3000/docs`
- Raw OpenAPI 3.0 Specification: `http://localhost:3000/openapi.json`
