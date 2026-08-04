# Sub-Agent 1 — Project Architecture Audit

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Scope**: High-level system architecture, folder topology, module organization, layered design patterns, separation of concerns, and compliance with SOLID & Clean Architecture principles.

---

## 1. Folder Structure & Topology

The backend codebase follows a **modular, domain-driven directory structure** located inside `backend/src/`. Key structural elements are summarized below:

```
backend/
├── src/
│   ├── app.ts                 # Express application instantiation & pipeline setup
│   ├── index.ts               # HTTP server bootstrap & graceful shutdown hooks
│   ├── common/                # Shared cross-cutting concerns
│   │   ├── errors/            # Custom application error hierarchy (AppError)
│   │   ├── middlewares/       # Express middlewares (auth, security, rate-limiting, CSRF, etc.)
│   │   ├── utils/             # Cross-cutting utility helpers (asyncHandler)
│   │   └── validators/        # Zod schema definitions for input validation
│   ├── config/                # Centralized environment variables & OpenAPI swagger specs
│   │   ├── env.ts             # Zod environment variable parsing & validation
│   │   ├── swagger.ts         # Swagger UI & OpenAPI integration
│   │   └── zod-openapi.ts     # Zod-to-OpenAPI schema generator setup
│   ├── generated/             # Auto-generated code artifacts
│   │   └── prisma/            # Generated Prisma Client code
│   ├── lib/                   # Infrastructure drivers & third-party abstractions
│   │   ├── audit.ts           # Audit logging helper
│   │   ├── cache.ts           # In-memory TTL cache implementation
│   │   ├── email.ts           # Nodemailer integration
│   │   ├── file-storage.ts    # Local disk storage with path traversal protection
│   │   ├── jwt.ts             # Jose JWT signing/verification engine
│   │   ├── logger.ts          # Pino logger instantiation
│   │   ├── password.ts        # Argon2 hashing abstraction
│   │   ├── prisma.ts          # Prisma Client singleton
│   │   ├── secrets.ts         # Cloud secret manager provider (AWS/Vault/Env)
│   │   └── token.ts           # Random token & SHA-256 hash helpers
│   └── modules/               # Domain Feature Modules
│       ├── admin/             # System administration & dashboard metrics
│       ├── ai-models/         # AI Matching model management & evaluation
│       ├── applications/      # Candidate applications & file uploads
│       ├── auth/              # Authentication, registration, password reset, MFA
│       ├── jobs/              # Job posting, keywords, matching rules
│       ├── matching/          # AI engine, candidate scoring, TF-IDF vectorizer, matching queue
│       ├── notifications/     # User in-app notifications
│       └── users/             # User profile management & RBAC settings
├── prisma/
│   ├── schema.prisma          # PostgreSQL database schema & enum definitions
│   └── seed.ts                # Database seeder script
├── scripts/                   # CLI maintenance scripts (OpenAPI generator, integration test, verification)
├── Dockerfile                 # Multi-stage production container build
├── docker-compose.yml         # Local development orchestration (PostgreSQL 16)
└── package.json               # Node.js manifest & scripts
```

---

## 2. Module Organization & Feature Boundaries

The backend implements a **Modular Monolith** architecture. Each domain feature resides in its dedicated directory under `backend/src/modules/` ([modules](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules)).

### Standard Module Anatomy
Every domain feature follows a standard triple-tier component structure:
1. **Controller (`*.controller.ts`)**: Handles HTTP requests, extracts parameters, validates inputs via Zod schemas, delegates business logic execution to the service tier, and formats HTTP responses.
2. **Routes (`*.routes.ts`)**: Defines Express routing tables, attaches authentication (`authenticate`), role-based access control (`requireRole`), rate limiting, and request validation middlewares (`validateBody`, `validateQuery`, `validateParams`).
3. **Service (`*.service.ts`)**: Encapsulates business logic, domain state transitions, data access queries using the Prisma client singleton ([prisma.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/prisma.ts#L1-L15)), and calls to infrastructure drivers in `src/lib/`.

---

## 3. Layered Architecture & Separation of Concerns

The request flow strictly adheres to a unidirectional layered pipeline:

```
[ HTTP Request ]
       │
       ▼
[ Middleware Pipeline ] (Cors, Helmet, RateLimiter, CSRF, Auth, Validation)
       │
       ▼
[ Controller Layer ] (Request parsing, HTTP status mapping, Response formatting)
       │
       ▼
[ Service Layer ] (Business rules, Workflow orchestrations, Scoring algorithms)
       │
       ▼
[ Infrastructure / Data Layer ] (Prisma Client, File Storage, Pino, Argon2, Jose)
       │
       ▼
[ PostgreSQL Database / Disk Storage ]
```

### Evaluation of Layer Isolation
- **Presentation Layer Separation**: Controllers do not invoke database queries directly; all database interaction goes through services.
- **Infrastructure Isolation**: Third-party libraries (`argon2`, `jose`, `pino`, `nodemailer`) are wrapped in `src/lib/` wrappers, preventing vendor lock-in across domain modules.
- **Cross-Cutting Concerns**: Shared concerns (Authentication, Validation, Error Handling, Logging, Rate Limiting) are completely extracted into `src/common/middlewares/` and `src/common/errors/`.

---

## 4. Architectural Pattern & SOLID Principles Audit

### Single Responsibility Principle (SRP) — **HIGH ADHERENCE**
- Controllers (`auth.controller.ts`, `jobs.controller.ts`) handle HTTP transport concerns only.
- Services (`matching.service.ts`, `auth.service.ts`) perform application logic.
- Utility drivers (`file-storage.ts`, `jwt.ts`, `password.ts`) do exactly one task.

### Open/Closed Principle (OCP) — **MODERATE/HIGH ADHERENCE**
- The secret management subsystem ([secrets.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/secrets.ts#L7-L43)) implements the `ISecretsManager` interface, allowing new cloud providers (AWS, HashiCorp Vault, Azure Key Vault) to be added without modifying consuming modules.
- Global Error Handling ([error.middleware.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/middlewares/error.middleware.ts#L54-L175)) handles standard JavaScript errors, custom `AppError` instances, Zod errors, Prisma errors, and Jose JWT errors dynamically.

### Liskov Substitution Principle (LSP) — **HIGH ADHERENCE**
- Strategy classes implementing `ISecretsManager` (`EnvironmentSecretsProvider`, `AwsSecretsManagerProvider`, `VaultSecretsProvider`) are fully interchangeable.

### Interface Segregation Principle (ISP) — **HIGH ADHERENCE**
- Request interfaces extension ([auth.middleware.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/middlewares/auth.middleware.ts#L6-L8)) add strictly typed payload properties (`req.user`) without forcing unnecessary dependencies.

### Dependency Inversion Principle (DIP) — **MODERATE ADHERENCE**
- Services directly import singleton instances (`import { prisma } from "../../lib/prisma.js"`). While appropriate for pragmatic TypeScript Node.js monoliths, explicit dependency injection containers (e.g., Awilix or TSYringe) are not used.

---

## 5. Architectural Strengths & Bottlenecks

### Strengths
1. **Strict Type Safety**: End-to-end TypeScript compilation with Zod runtime validation and custom Prisma client generation outputting to `src/generated/prisma`.
2. **Double-Submit Cookie CSRF & JWT Resilience**: Dual support for Bearer Tokens (mobile/API clients) and HTTP-Only cookies with Double Submit CSRF headers ([csrf.middleware.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/common/middlewares/csrf.middleware.ts#L36-L75)).
3. **Deterministic Local AI Engine**: Offline TF-IDF vectorizer and rule-based candidate matching engine ([semantic-embedding.service.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/matching/semantic-embedding.service.ts#L73-L135)) eliminating reliance on expensive external API calls for candidate scoring.

### Identified Architectural Risks
1. **In-Memory Matching Queue State**: The async matching queue ([matching-queue.service.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/matching/matching-queue.service.ts#L24)) uses an in-memory JavaScript `Map<string, MatchingJobState>`. Server restarts clear in-flight jobs.
2. **In-Memory TTL Cache**: Cache helper ([cache.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/cache.ts#L9)) relies on an in-memory map instead of distributed Redis cache, limiting horizontal scaling to single-instance deployments.
