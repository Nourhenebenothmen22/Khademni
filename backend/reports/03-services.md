# Sub-Agent 3 — Business Logic Audit & Service Architecture Report

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Status**: Verified & Synchronized with Current Codebase  
**Scope**: Application Services, Use Cases, Core Business Rules, Interview Lifecycle, AI Scoring Synthesis, and Transaction Management.

---

## 1. Domain Service Mapping

The core business logic resides in service files located under `backend/src/modules/`:

| Module | Service File | Domain Capabilities & Use Cases |
| :--- | :--- | :--- |
| `auth` | [`auth.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/auth/auth.service.ts) | User registration with Argon2 hashing, email verification token generation, login session creation, access & refresh token issuance (with `organizationId` & `isSuperAdmin`), transactional session rotation (`refreshSession`) with database user re-verification, MFA TOTP setup/verification with AES-256-GCM encryption, password reset workflows. |
| `users` | [`users.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/users/users.service.ts) | Profile CRUD, email re-verification triggers, user role updates, avatar media streaming. |
| `jobs` | [`jobs.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/jobs/jobs.service.ts)<br>[`job-keywords.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/jobs/job-keywords.service.ts)<br>[`job-matching-rules.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/jobs/job-matching-rules.service.ts) | Multi-tenant job posting lifecycle management (`DRAFT` $\to$ `PUBLISHED` $\to$ `CLOSED` $\to$ `ARCHIVED`), keyword management (`REQUIRED`, `OPTIONAL`, `BONUS`), rule engine configuration (`DEGREE`, `EXPERIENCE`, `CERTIFICATION`, `CUSTOM`), and 384d embedding updates. |
| `applications` | [`applications.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/applications/applications.service.ts) | Job application intake with magic-byte validation, tracking code generation (`APP-XXXXXXXX`), document storage, status transition validation (`SUBMITTED` $\to$ `UNDER_REVIEW` $\to$ `SHORTLISTED` / `REJECTED` $\to$ `INTERVIEW_SCHEDULED` $\to$ `ACCEPTED`). |
| `interviews` | [`interviews.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/interviews/interviews.service.ts)<br>[`calendar.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/interviews/calendar.service.ts) | Interview scheduling (`SCHEDULED`, `COMPLETED`, `CANCELLED`, `RESCHEDULED`, `NO_SHOW`), panel assignments, RFC 5545 `.ics` file generation with CRLF defense, evaluator scorecards (`ScorecardCriteriaScore`), and Brevo email webhook ingestion. |
| `organizations`| [`organizations.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/organizations/organizations.service.ts) | Tenant profile management and scoped organization directory listing. |
| `matching` | [`matching.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/matching/matching.service.ts)<br>[`document-parser.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/matching/document-parser.service.ts)<br>[`hybrid-search.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/matching/hybrid-search.service.ts)<br>[`matching-queue.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/matching/matching-queue.service.ts) | Resume parsing, local ONNX 384d embeddings, pgvector + tsvector Reciprocal Rank Fusion, Cross-Attention reranking, degree hierarchy regex, experience date interval union merging, and background BullMQ batch processing. |
| `ai-models` | [`ai-models.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/ai-models/ai-models.service.ts)<br>[`evaluations.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/ai-models/evaluations.service.ts) | Model version registration, hyperparameter tuning, model activation toggling, evaluation metric logging (**Super Admin Only**). |
| `admin` | [`admin.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/admin/admin.service.ts) | Tenant metrics aggregation, user management, audit log inspection. |
| `notifications`| [`notifications.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/notifications/notifications.service.ts) | Candidate & recruiter in-app notifications. |

---

## 2. Interview & Application Lifecycle

```
[ Application: SUBMITTED ]
            │
            ▼
[ Application: UNDER_REVIEW ]
            │
            ▼ (AI Match & Screening)
[ Application: SHORTLISTED ]
            │
            ▼ (Schedule Interview)
[ Interview: SCHEDULED ] ───> Generates RFC 5545 .ics Calendar File & Dispatches Brevo Emails
            │
            ▼ (Interview Conducted)
[ Interview: COMPLETED ] ───> Panel Submits Scorecard & Recommendation
            │
            ▼
[ Application: ACCEPTED / REJECTED ]
```
