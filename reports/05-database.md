# Sub-Agent 5 — Database Layer Audit

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Scope**: Database Schema, Prisma ORM, Models, Entity Relationships, Indexes, Query Patterns, Migration History, and Transaction Handling.

---

## 1. Database Architecture & ORM Setup

- **Database Engine**: PostgreSQL 16 (configured via `docker-compose.yml`).
- **ORM**: Prisma ORM `v7.8.0` with `@prisma/adapter-pg` driver.
- **Client Generation Target**: Output set to `src/generated/prisma` ([schema.prisma:L3](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/prisma/schema.prisma#L3)).

---

## 2. Data Models & Entity Relationships

The schema defines **14 database tables** representing core domain entities:

```
[ Organization ] ───────< [ User ] ───────< [ AuthSession ]
       │                     │
       ├─< [ JobPost ] <─────┼─< [ Application ] ───< [ ApplicationDocument ] ─── [ DocumentParseResult ]
       │       │             │         │
       │       ├─< [JobKeyword]        ├─< [ MatchingRun ] ─── [ ApplicationScore ]
       │       └─< [JobMatchingRule]   └─< [ ApplicationStatusHistory ]
       │                     │
       └─────────────────────┴───────< [ AuditLog ] & [ Notification ]
```

### Table Summary & Primary Entities

| Model | DB Map Name | Primary Key | Description & Relations |
| :--- | :--- | :--- | :--- |
| `Organization` | `organizations` | `cuid()` | Tenant organization entity. Has many Users, JobPosts, AuditLogs. |
| `User` | `users` | `cuid()` | User account entity (ADMIN, CANDIDATE). Belongs to Organization. Has many AuthSessions, JobPosts, Applications, AuditLogs, Notifications. |
| `AuthSession` | `auth_sessions` | `cuid()` | User refresh token sessions. Belongs to User. Stores token hash, IP, user-agent, expiry. |
| `JobPost` | `job_posts` | `cuid()` | Job vacancy posting. Belongs to Organization and User (createdBy). Has many JobKeywords, JobMatchingRules, Applications. |
| `JobKeyword` | `job_keywords` | `cuid()` | Weighted keyword requirement for a job (REQUIRED, OPTIONAL, BONUS). Unique on `(jobPostId, keyword)`. |
| `JobMatchingRule` | `job_matching_rules` | `cuid()` | Condition-based matching rule (EXPERIENCE, DEGREE, CERTIFICATION, KEYWORD, CUSTOM). |
| `Application` | `applications` | `cuid()` | Candidate job application. Unique on `(candidateId, jobPostId)`. Has unique `trackingCode`. |
| `ApplicationDocument` | `application_documents` | `cuid()` | Uploaded candidate files (CV, MOTIVATION_LETTER). Unique on `(applicationId, type)`. Stores SHA-256 hash. |
| `DocumentParseResult` | `document_parse_results` | `cuid()` | Text extraction result for a document. 1-to-1 with ApplicationDocument. |
| `AIMatchingModel` | `ai_matching_models` | `cuid()` | AI model metadata & hyperparameter configuration. Has many MatchingRuns and Evaluations. |
| `AIMatchingModelEvaluation`| `ai_matching_model_evaluations` | `cuid()` | Model benchmark evaluation run. Has many AIMatchingMetrics. |
| `AIMatchingMetric` | `ai_matching_metrics` | `cuid()` | Quantitative evaluation metric (ACCURACY, PRECISION, RECALL, F1_SCORE, NDCG_AT_5, MAP, MRR). |
| `MatchingRun` | `matching_runs` | `cuid()` | Single execution of AI matching engine for an application. Stores score breakdowns & semantic results. |
| `ApplicationScore` | `application_scores` | `cuid()` | Final aggregated candidate score and recommendation (HIGHLY_RECOMMENDED, etc.). 1-to-1 with Application. |
| `ApplicationStatusHistory`| `application_status_histories` | `cuid()` | Application status change log. Belongs to Application and User (changedBy). |
| `AuditLog` | `audit_logs` | `cuid()` | Administrative and security action log. Belongs to User and Organization. |
| `Notification` | `notifications` | `cuid()` | In-app user notifications. |

---

## 3. Database Indexes Audit

The schema establishes targeted indexes to accelerate high-frequency queries:

| Model | Index Target | Query Purpose |
| :--- | :--- | :--- |
| `User` | `@@index([role])`, `@@index([organizationId])` | Role filtering and tenant isolation |
| `AuthSession` | `@@index([userId])`, `@@index([userId, revokedAt])` | Fast session lookup and revocation verification |
| `JobPost` | `@@index([status])`, `@@index([createdById])`, `@@index([organizationId])` | Job search by status, recruiter dashboard queries |
| `JobKeyword` | `@@index([jobPostId])`, `@@index([jobPostId, type])` | Candidate matching keyword fetches |
| `Application` | `@@index([jobPostId])`, `@@index([status])` | Recruiter application listing and status filtering |
| `ApplicationDocument` | `@@index([sha256])` | File duplicate detection |
| `MatchingRun` | `@@index([applicationId])`, `@@index([status])`, `@@index([modelId])` | Matching run history and queue status lookup |
| `ApplicationScore` | `@@index([finalScore])` | Ranking candidates by match score |
| `AuditLog` | `@@index([userId])`, `@@index([action])`, `@@index([entityType, entityId])`, `@@index([createdAt])` | Security audit searches, entity tracking, time-series queries |
| `Notification` | `@@index([userId, isRead])`, `@@index([createdAt])` | User unread notification count badge |

---

## 4. Query Optimization & Transactions

- **Transaction Isolation**: Multi-table state updates (such as candidate registration creating user + auth session, or application submission saving documents + creating status history) use Prisma sequential transactions (`prisma.$transaction([])`).
- **Prisma Client Singleton**: Managed in [`backend/src/lib/prisma.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/prisma.ts) using global variable reuse in development mode to prevent connection pool exhaustion during hot-reloads.

---

## 5. Migration History & Seed Script Audit

- **Migration History**: Migration [`20260804200000_add_organization_and_notifications`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/prisma/migrations/20260804200000_add_organization_and_notifications/migration.sql) establishes `organizations` and `notifications` tables, `organizationId` foreign keys, and missing audit log indexes in PostgreSQL.
- **Seed Execution**: [`prisma/seed.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/prisma/seed.ts) uses Argon2 password hashing (`hashPassword()`) to seed default `Organization`, `User` accounts (Admin & Candidate), active `AIMatchingModel`, and sample `JobPost`. Executable cleanly via `npm run db:seed`.

