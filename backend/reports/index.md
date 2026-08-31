# Global Backend Architecture Audit Index

Welcome to the complete Architecture Audit documentation repository for the **Intelligent Teacher Recruitment Platform**. This directory contains domain-specific technical reports and a master executive summary synthesized directly from source code inspection.

---

## Master Reports
- [`00-executive-summary.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/00-executive-summary.md) — High-level summary of findings, compliance matrix, and strategic recommendations.

---

## Domain Technical Audit Reports

1. [`01-architecture.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/01-architecture.md) — **Project Architecture**  
   *Folder structure, module organization, layered design, SOLID principles, Clean Architecture.*
2. [`02-api.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/02-api.md) — **API Layer**  
   *Controllers, routes, Zod DTOs, request lifecycle, OpenAPI 3.0 specs (`registry.registerPath()` & `npm run openapi:generate`), API versioning.*
3. [`03-services.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/03-services.md) — **Business Logic**  
   *Services, use cases, business rules, AI scoring algorithm, state machine transitions, interview workflows.*
4. [`04-middlewares.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/04-middlewares.md) — **Middleware Pipeline**  
   *9-step Express execution pipeline, authentication, RBAC (`requireRole`, `requireSuperAdmin`), tenant isolation (`requireTenantAccess`), 8 Redis-backed rate limiters (`rate-limit-redis`), in-memory magic-byte upload validation (`file-type`), Double Submit CSRF with `crypto.timingSafeEqual`, global error handler.*
5. [`05-database.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/05-database.md) — **Database Layer**  
   *PostgreSQL 16, Prisma ORM schema, 23 domain models (including `Organization`, `CandidateHybridIndex`, `InterviewScorecard`), pgvector 384d extensions, Argon2 seed script, indexes, parameterized SQL.*
6. [`06-ai.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/06-ai.md) — **AI Modules**  
   *Document parsers (`pdf-parse`), ONNX dense embedding transformer (`Xenova/all-MiniLM-L6-v2`), pgvector cosine distance, tsvector lexical search, Reciprocal Rank Fusion (RRF), Cross-Attention reranker, model evaluations.*
7. [`07-security.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/07-security.md) — **Authentication & Security**  
   *Jose JWT access/refresh tokens, Argon2 password hashing, SHA-256 token digests, AES-256-GCM column encryption, TOTP MFA, CSRF `timingSafeEqual`, Super Admin database boolean, parameterized SQL, magic-byte upload validation, Brevo webhook HMAC-SHA256, and Redis password auth.*
8. [`08-background.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/08-background.md) — **Background Processing**  
   *Asynchronous matching queue with Redis 7 & BullMQ workers, job state persistence, non-blocking background workers.*
9. [`09-configuration.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/09-configuration.md) — **Configuration**  
   *Zod environment schema validation with `superRefine` production secret enforcement, Multi-stage Docker build, Docker Compose segmented networks (`backend_net`, `frontend_net`).*
10. [`10-utils.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/10-utils.md) — **Utilities**  
    *AppError exception class, AsyncRequestHandler, Redis client abstraction, AES-256-GCM encryption library, disk file storage path traversal security guards, cryptographic token helpers.*
11. [`11-observability.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/11-observability.md) — **Logging & Monitoring**  
    *Pino structured JSON logs, sensitive data redaction, X-Request-ID distributed tracing, DB health checks.*
12. [`12-testing.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/12-testing.md) — **Testing**  
    *Vitest unit testing suite, integration test runner script (`scripts/integration-test.ts`), static TypeScript type checks (`tsc --noEmit`), OpenAPI document generation verification.*
13. [`13-performance.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/13-performance.md) — **Performance**  
    *CPU/Memory hotspot analysis, query optimization, compound database indexes, vector indexing, streaming file efficiency.*
14. [`14-documentation.md`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/reports/14-documentation.md) — **Documentation & Diagrams**  
    *Comprehensive architecture manual with complete Mermaid diagrams (Topology, Module Dependencies, Sequence, Auth, AI Pipeline, Complete 23-Model ERD).*
