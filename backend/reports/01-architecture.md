# Sub-Agent 1 — Project Architecture Audit & Topology Report

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Status**: Verified & Synchronized with Current Codebase  
**Scope**: System architecture, folder topology, module organization, layered design patterns, and separation of concerns.

---

## 1. Folder Structure & Topology

```
backend/
├── src/
│   ├── app.ts                 # Express application instantiation & pipeline setup
│   ├── index.ts               # HTTP server bootstrap & graceful shutdown hooks
│   ├── common/                # Shared cross-cutting concerns
│   │   ├── errors/            # Custom application error hierarchy (AppError)
│   │   ├── middlewares/       # Middlewares (auth, tenant, security, rate-limiting, CSRF, magic-byte upload)
│   │   ├── utils/             # Cross-cutting utility helpers (asyncHandler)
│   │   └── validators/        # Zod schema definitions for input validation
│   ├── config/                # Centralized environment variables & OpenAPI swagger specs
│   │   ├── env.ts             # Zod environment variable parsing & validation
│   │   ├── swagger.ts         # Swagger UI & OpenAPI integration
│   │   └── zod-openapi.ts     # Zod-to-OpenAPI schema generator setup
│   ├── generated/             # Auto-generated code artifacts
│   │   └── prisma/            # Generated Prisma Client code
│   ├── lib/                   # Infrastructure drivers & third-party abstractions
│   │   ├── audit.ts           # Non-blocking audit logging helper
│   │   ├── cache.ts           # Redis & in-memory TTL caching
│   │   ├── email.ts           # Brevo SMTP transport integration
│   │   ├── encryption.ts      # AES-256-GCM column encryption / decryption
│   │   ├── file-storage.ts    # Local disk storage with path traversal protection
│   │   ├── jwt.ts             # Jose JWT signing/verification engine
│   │   ├── logger.ts          # Pino logger instantiation
│   │   ├── password.ts        # Argon2 hashing abstraction
│   │   ├── prisma.ts          # Prisma Client singleton
│   │   ├── redis.ts           # Redis 7 client singleton (ioredis)
│   │   ├── secrets.ts         # Cloud secret manager provider (AWS/Vault/Env)
│   │   └── token.ts           # Random token & SHA-256 hash helpers
│   └── modules/               # 10 Domain Feature Modules
│       ├── admin/             # System administration & dashboard metrics
│       ├── ai-models/         # AI Matching model management & evaluation (Super Admin)
│       ├── applications/      # Candidate applications & status transitions
│       ├── auth/              # Authentication, registration, password reset, MFA
│       ├── interviews/        # Scheduling, RFC 5545 iCal, scorecards, Brevo webhook
│       ├── jobs/              # Job posting, keywords, matching rules
│       ├── matching/          # In-process ONNX embeddings, hybrid RRF search, BullMQ
│       ├── notifications/     # User in-app notifications
│       ├── organizations/     # Multi-tenant organization profiles & scoped directory
│       └── users/             # User profile management, avatar media streaming
├── prisma/
│   ├── schema.prisma          # PostgreSQL database schema (23 models)
│   ├── seed.ts                # Database seeder script with env passwords
│   └── migrations/            # Versioned SQL database migrations
├── scripts/                   # CLI scripts (OpenAPI generator, integration test, verify-smtp)
├── Dockerfile                 # Multi-stage production container build
├── docker-compose.yml         # Local development orchestration
└── package.json               # Node.js manifest & scripts
```

---

## 2. Module Organization & Feature Boundaries

The backend implements a **Modular Monolith** architecture with 10 isolated domain modules:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           10 Domain Modules                             │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│     auth     │    users     │     jobs     │ applications │ interviews  │
├──────────────┼──────────────┼──────────────┼──────────────┼─────────────┤
│ organizations│   matching   │  ai-models   │notifications │    admin    │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘
```

Each module follows clean architecture layering:
1. **Controller (`*.controller.ts`)**: Parses requests, invokes validators, calls domain service, and outputs structured JSON responses.
2. **Routes (`*.routes.ts`)**: Defines endpoint routes, mounts rate limiters, auth middleware, and validation rules.
3. **Service (`*.service.ts`)**: Implements business transactions, tenant scoping, and Prisma operations.
