# Global Backend Architecture Audit Index

Welcome to the complete Architecture Audit documentation repository for the **Intelligent Teacher Recruitment Platform**. This directory contains domain-specific technical reports and a master executive summary synthesized directly from source code inspection.

---

## Master Reports
- [`00-executive-summary.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/00-executive-summary.md) — High-level summary of findings, compliance matrix, and strategic recommendations.

---

## Domain Technical Audit Reports

1. [`01-architecture.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/01-architecture.md) — **Project Architecture**  
   *Folder structure, module organization, layered design, SOLID principles, Clean Architecture.*
2. [`02-api.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/02-api.md) — **API Layer**  
   *Controllers, routes, Zod DTOs, request lifecycle, OpenAPI 3.0 specs (`registry.registerPath()` & `npm run openapi:generate`), API versioning.*
3. [`03-services.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/03-services.md) — **Business Logic**  
   *Services, use cases, business rules, AI scoring algorithm, state machine transitions.*
4. [`04-middlewares.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/04-middlewares.md) — **Middleware Pipeline**  
   *9-step Express execution pipeline, authentication, RBAC, tenant isolation (`requireTenantAccess`), 7 Redis-backed rate limiters (`rate-limit-redis`), Multer disk upload, Double Submit CSRF with `crypto.timingSafeEqual`, global error handler.*
5. [`05-database.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/05-database.md) — **Database Layer**  
   *PostgreSQL 16, Prisma ORM schema, 16 domain models (including `Organization` & `Notification`), migration `20260804200000`, Argon2 seed script, indexes, sequential transactions.*
6. [`06-ai.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/06-ai.md) — **AI Modules**  
   *Document parsers (`pdf-parse` integration), TF-IDF term vectorizer, cosine similarity math engine, model evaluations, vector DB readiness.*
7. [`07-security.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/07-security.md) — **Authentication & Security**  
   *Jose JWT access/refresh tokens (≥ 32 chars), Argon2 password hashing, SHA-256 token digests, TOTP MFA, CSRF `timingSafeEqual`, Helmet, log redaction, production secret enforcement (`envSchema.superRefine`), complete multi-tenant query scoping across all modules (`organizationId`), and transactional session rotation (`refreshSession`) with 10s grace period and breach detection.*
8. [`08-background.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/08-background.md) — **Background Processing**  
   *Asynchronous matching queue with Redis state persistence (`matching_job:<id>` 24h TTL) and in-memory fallback, non-blocking workers.*
9. [`09-configuration.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/09-configuration.md) — **Configuration**  
   *Zod environment schema validation with `superRefine` production secret enforcement, Multi-stage Docker build, Docker Compose environment without fallback secrets.*
10. [`10-utils.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/10-utils.md) — **Utilities**  
    *AppError (default 500 status), AsyncRequestHandler, `src/lib/redis.ts` client abstraction, disk file storage path traversal security guards, cryptographic token helpers.*
11. [`11-observability.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/11-observability.md) — **Logging & Monitoring**  
    *Pino structured JSON logs (LOG_LEVEL config), sensitive data redaction, X-Request-ID distributed tracing, DB health checks.*
12. [`12-testing.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/12-testing.md) — **Testing**  
    *Integration test runner script (`scripts/integration-test.ts`), static TypeScript type checks (`tsc --noEmit`), OpenAPI document generation verification.*
13. [`13-performance.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/13-performance.md) — **Performance**  
    *CPU/Memory hotspot analysis, query optimization, TTL caching strategies, streaming file efficiency.*
14. [`14-documentation.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/reports/14-documentation.md) — **Documentation & Diagrams**  
    *Comprehensive architecture manual with 6 complete Mermaid diagrams (8-module Topology, Module Dependencies, Sequence, Auth, AI Pipeline, Complete ERD).*
