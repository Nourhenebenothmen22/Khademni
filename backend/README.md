# Intelligent Teacher Recruitment Platform — Backend API

Production-ready, scalable, and secure RESTful backend service for an **Intelligent Teacher Recruitment Platform**, built with **Node.js 22, Express v5, TypeScript, Prisma ORM, PostgreSQL 16 (pgvector 384d), Redis, and a Hybrid AI Candidate-Matching Engine**.

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

The **Intelligent Teacher Recruitment Platform Backend** provides a multi-tenant recruitment pipeline for educational institutions. It automates candidate intake, PDF CV resume parsing, application status state-machine transitions, rule-based qualification screening, interview scheduling & scorecard evaluations, and hybrid AI-powered candidate scoring.

### Core Capabilities
- **Auth & Identity**: Role-based access control (`ADMIN`, `CANDIDATE`), Super Admin clearance (`requireSuperAdmin`), Argon2 password hashing, dual JWT rotation with breach defense, and Time-based One-Time Password (TOTP 2FA via `otplib`).
- **Multi-Tenant Isolation**: Enforces tenant boundaries via `requireTenantAccess` middleware, controller-level `getOrganizationId(req)` extraction, service-level Prisma query scoping (`organizationId`), atomic `updateMany` mutations, and automatic `CROSS_TENANT_ACCESS_ATTEMPT` audit logging.
- **Job & Requirement Management**: Job listings with status transitions (`DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`), weighted keywords (`REQUIRED`, `OPTIONAL`, `BONUS`), and rule criteria (`DEGREE`, `EXPERIENCE`, `CERTIFICATION`, `CUSTOM`).
- **Candidate CV Intake & Parsing**: File streaming upload with Multer, path-traversal disk storage security, SHA-256 document checksum deduplication, PDF text extraction via `pdf-parse`, and automatic ONNX 384d vector embedding generation.
- **Hybrid AI Matching Engine**: Composite candidate scoring engine combining keyword matching, deterministic rule criteria evaluation, pgvector 384d dense vector distance search (`<=>`), and TF-IDF cosine similarity term vectorization.
- **Interview Scheduling & Evaluation**: Structured interview scheduling (`SCHEDULED`, `COMPLETED`, `CANCELLED`, `RESCHEDULED`, `NO_SHOW`), interviewer assignments, criteria scorecards (`ScorecardCriteriaScore`), and tenant provider credentials (`OrganizationProviderConfig`).
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
│ Applications, Admin│       │ ONNX 384d Embedder,│           │ pgvector Extension │
│ Interviews, AI-    │       │ TF-IDF Vectorizer, │           │ Redis (Store/Queue)│
│ Notifications      │       │ Matching Queue     │           │ Local Disk Storage │
└────────────────────┘       └────────────────────┘           └────────────────────┘
```

- **Runtime**: Node.js v22 (Native ES Modules / ESM)
- **Framework**: Express v5
- **Language**: TypeScript v5 (Strict Mode)
- **Database ORM**: Prisma ORM v7 (`@prisma/client`) with PostgreSQL 16 & pgvector
- **Cache & Key-Value Store**: Redis (via `ioredis` and `rate-limit-redis`)
- **Document Extraction**: `pdf-parse` (v1.1.1)
- **AI Feature Extractor**: ONNX `@xenova/transformers` (`Xenova/all-MiniLM-L6-v2` 384d embeddings)
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
│   ├── schema.prisma              # PostgreSQL 16 Prisma Schema (23 Models)
│   ├── seed.ts                    # Database Seed Script (Argon2 Hashed Admin & Seed Data)
│   └── migrations/                # SQL Database Migrations
├── scripts/
│   ├── integration-test.ts        # Comprehensive E2E Integration Test Suite
│   ├── enable-vector.ts           # PostgreSQL Extension Initializer (vector & pg_trgm)
│   └── generate-openapi.ts        # OpenAPI 3.0 JSON Spec Generator
├── src/
│   ├── app.ts                     # Express App Initialization & Middleware Stack
│   ├── index.ts                   # Server Listener & Graceful Shutdown
│   ├── config/                    # Environment, Swagger & Zod-OpenAPI Config
│   │   ├── env.ts                 # Zod Environment Validation & Production Secret Enforcement
│   │   ├── swagger.ts             # OpenAPI Route Registrations
│   │   └── zod-openapi.ts         # Zod OpenAPI Registry
│   ├── lib/                       # Core Infrastructure Services
│   │   ├── audit.ts               # Non-blocking Database Audit Logger
│   │   ├── cache.ts               # TTL Caching Utilities
│   │   ├── email.ts               # Email Service (Brevo SMTP Updates & Verification)
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
│       ├── ai-models/             # AI Matching Models & Super Admin Metric Tracking
│       ├── applications/          # Applications State Machine & Document Download
│       ├── auth/                  # Register, Login, MFA, Password Reset, Refresh
│       ├── interviews/            # Interview Scheduling, Scorecards & Provider Credentials
│       ├── jobs/                  # Job Post CRUD, Keywords, Matching Rules & Vector Persist
│       ├── matching/              # Hybrid Matching Engine, Queue & ONNX Document Embedder
│       ├── notifications/         # Candidate In-App Notification System
│       └── users/                 # Profile & User Operations
├── docker-compose.yml             # Containerized Local Infrastructure Stack
├── Dockerfile                     # Multi-stage Containerization Build File
├── openapi.json                   # Generated OpenAPI 3.0 Document
└── package.json                   # Project Dependencies & Package Scripts
```

---

## Prerequisites

Before setting up the backend, ensure you have installed:
- **Node.js**: v22.0.0 or higher
- **npm**: v10.0.0 or higher
- **PostgreSQL**: v16 or higher with `vector` extension
- **Redis**: v7 or higher (Optional; in-memory fallback active when unconfigured)

---

## Environment Variables

All environment variables are validated at startup via `src/config/env.ts` using Zod.

| Key | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development \| production \| test` | `development` | Deployment environment state |
| `PORT` | `number` | `3000` | HTTP server listening port |
| `LOG_LEVEL` | `fatal \| error \| warn \| info \| debug \| trace` | `info` | Pino structured log level |
| `CORS_ORIGIN` | `string` | `http://localhost:5173,http://localhost:3000,http://localhost:3001` | Comma-separated allowed CORS origins |
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
| `FRONTEND_URL` | `string` | `http://localhost:3001` | Frontend application base URL |

---

## Database Setup & Models

The database layer utilizes PostgreSQL 16 with **23 Prisma schema models**:

- **`Organization`**: Tenant organization entity.
- **`User`**: User accounts (`ADMIN` / `CANDIDATE`), lockout state, TOTP secrets, `organizationId` foreign key.
- **`AuthSession`**: Active refresh token sessions with rotation tracking.
- **`JobPost`**: Job postings, status (`DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`), `embedding vector(384)`, `organizationId` foreign key.
- **`JobKeyword`**: Weighted job keywords (`REQUIRED`, `OPTIONAL`, `BONUS`).
- **`JobMatchingRule`**: Dynamic matching rules (`DEGREE`, `EXPERIENCE`, `CERTIFICATION`, `CUSTOM`).
- **`Application`**: Candidate job applications and tracking codes (`INTERVIEW_SCHEDULED`, `INTERVIEWED`).
- **`ApplicationDocument`**: Document metadata, storage key, SHA-256 checksum.
- **`DocumentParseResult`**: Extracted text content, structured metadata, `embedding vector(384)`.
- **`AIMatchingModel`**: Dynamic model hyperparameters and activation state.
- **`AIMatchingModelEvaluation`**: Performance evaluation run datasets.
- **`AIMatchingMetric`**: Evaluation metrics (`PRECISION`, `RECALL`, `F1_SCORE`, `NDCG_AT_5`, `MAP`).
- **`MatchingRun`**: Execution record storing total scores, keyword matches, and rule breakdowns.
- **`ApplicationScore`**: Candidate final recommendation (`HIGHLY_RECOMMENDED`, `RECOMMENDED`, `AVERAGE`, `NOT_RECOMMENDED`).
- **`ApplicationStatusHistory`**: Audit trail of application status changes.
- **`AuditLog`**: Non-blocking system audit logs with indexes on `action` and `(entityType, entityId)`.
- **`Notification`**: Candidate in-app notifications.
- **`Interview`**: Interview records (`SCHEDULED`, `COMPLETED`, `CANCELLED`, `RESCHEDULED`, `NO_SHOW`).
- **`InterviewerAssignment`**: Assigned interviewers per interview session.
- **`InterviewScorecard`**: Interview evaluation scorecard recommendations.
- **`ScorecardCriteriaScore`**: Individual criterion rating scores.
- **`OrganizationProviderConfig`**: Tenant API credentials for calendar/video providers (`ZOOM`, `GOOGLE_MEET`).
- **`CandidateHybridIndex`**: Combined dense vector (`vector(384)`) and full-text (`tsvector`) candidate search table.

---

## Development & Production Commands

| Script Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start development server with hot-reload (`tsx watch src/index.ts`) |
| `npm run build` | Compile TypeScript source code to `./dist` (`tsc`) |
| `npm start` | Run compiled production build (`node dist/index.js`) |
| `npm run typecheck` | Perform static type checking (`tsc --noEmit`) |
| `npm run test` | Run complete test suites (`vitest run && tsx scripts/integration-test.ts`) |
| `npm run openapi:generate` | Generate updated `openapi.json` from Zod routes (`tsx scripts/generate-openapi.ts`) |
| `npx prisma db seed` | Execute database seeding (`ts-node prisma/seed.ts`) |
