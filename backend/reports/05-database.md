# Sub-Agent 5 — Database Layer Audit & Architecture Report

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Status**: Verified & Synchronized with Current Codebase  
**Scope**: Database Schema, Prisma ORM, 23 Models, Entity Relationships, Indexes, pgvector Extension, Migration History, and Parameterized SQL.

---

## 1. Database Architecture & ORM Setup

- **Database Engine**: PostgreSQL 16 with `pgvector` and `pg_trgm` extensions enabled.
- **ORM**: Prisma ORM `v7.8.0` with `@prisma/adapter-pg` driver.
- **Client Generation Target**: Output set to `src/generated/prisma`.

---

## 2. Data Models & Entity Relationships (23 Models)

```
[ Organization ] ───────< [ User ] ───────< [ AuthSession ]
       │                     │
       ├─< [ JobPost ] <─────┼─< [ Application ] ───< [ ApplicationDocument ] ─── [ DocumentParseResult ]
       │       │             │         │
       │       ├─< [JobKeyword]        ├─< [ MatchingRun ] ─── [ ApplicationScore ]
       │       └─< [JobMatchingRule]   ├─< [ ApplicationStatusHistory ]
       │                               ├─< [ Interview ] ───< [ InterviewScorecard ] ───< [ ScorecardCriteriaScore ]
       │                               │         │
       │                               │         └─< [ InterviewerAssignment ]
       │                               │
       │                               └─< [ CandidateHybridIndex ]
       │
       ├─< [ OrganizationProviderConfig ]
       └─< [ AuditLog ] & [ Notification ]
```

### Complete 23-Model Table Summary

| Model | DB Map Name | Primary Key | Description & Relations |
| :--- | :--- | :--- | :--- |
| `Organization` | `organizations` | `cuid()` | Tenant institution entity. Has many Users, JobPosts, AuditLogs, Interviews, ProviderConfigs, CandidateHybridIndexes. |
| `User` | `users` | `cuid()` | User account entity (ADMIN, CANDIDATE), `isSuperAdmin` boolean, encrypted MFA secret. |
| `AuthSession` | `auth_sessions` | `cuid()` | Active refresh token sessions with IP, User-Agent, and token hash. |
| `JobPost` | `job_posts` | `cuid()` | Job vacancy posting with status (`DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`) and `embedding vector(384)`. |
| `JobKeyword` | `job_keywords` | `cuid()` | Weighted keyword requirement (REQUIRED, OPTIONAL, BONUS). Unique on `(jobPostId, keyword)`. |
| `JobMatchingRule` | `job_matching_rules` | `cuid()` | Condition-based matching rule (DEGREE, EXPERIENCE, CERTIFICATION, KEYWORD, CUSTOM). |
| `Application` | `applications` | `cuid()` | Candidate job application with unique `trackingCode` (`APP-XXXXXXXX`). |
| `ApplicationDocument` | `application_documents` | `cuid()` | Uploaded files (CV, MOTIVATION_LETTER) with SHA-256 checksum and storage keys. |
| `DocumentParseResult` | `document_parse_results` | `cuid()` | Extracted resume text content, structured metadata, and `embedding vector(384)`. |
| `AIMatchingModel` | `ai_matching_models` | `cuid()` | AI model hyperparameters and active algorithm configuration. |
| `AIMatchingModelEvaluation`| `ai_matching_model_evaluations` | `cuid()` | Benchmark evaluation datasets and average latency. |
| `AIMatchingMetric` | `ai_matching_metrics` | `cuid()` | Benchmark evaluation metrics (ACCURACY, PRECISION, RECALL, F1_SCORE, NDCG_AT_5, MAP, MRR). |
| `MatchingRun` | `matching_runs` | `cuid()` | Single execution of AI matching engine with rule results and score breakdown JSON. |
| `ApplicationScore` | `application_scores` | `cuid()` | Final aggregated candidate score and recommendation category. |
| `ApplicationStatusHistory`| `application_status_histories` | `cuid()` | Application status change log with user references. |
| `AuditLog` | `audit_logs` | `cuid()` | Immutable platform security and administrative action log. |
| `Notification` | `notifications` | `cuid()` | In-app user notifications with `isRead` flag and metadata. |
| `Interview` | `interviews` | `cuid()` | Scheduled interview records (SCREENING, TECHNICAL, PEDAGOGICAL_DEMO, BEHAVIORAL, FINAL_HR). |
| `InterviewerAssignment` | `interviewer_assignments` | `cuid()` | Assigned panel interviewers per interview session. |
| `InterviewScorecard` | `interview_scorecards` | `cuid()` | Post-interview evaluator scorecard and overall recommendation. |
| `ScorecardCriteriaScore` | `scorecard_criteria_scores` | `cuid()` | Numerical rating (1-5) and comment per evaluation criterion. |
| `OrganizationProviderConfig`| `organization_provider_configs` | `cuid()` | Encrypted tenant credentials for calendar/video providers (`ZOOM`, `GOOGLE_MEET`, `MS_TEAMS`). |
| `CandidateHybridIndex` | `candidate_hybrid_indexes` | `cuid()` | Multi-tenant partitioned search table with `dense_embedding vector(384)` and `search_vector tsvector`. |

---

## 3. Database Indexes & Partitioning

| Model | Index Target | Query Purpose |
| :--- | :--- | :--- |
| `User` | `email` (UNIQUE), `(organizationId, role)` | Login lookups and tenant member filtering |
| `JobPost` | `organizationId`, `(organizationId, status)` | Multi-tenant job directory queries |
| `Application` | `(candidateId, jobPostId)` (UNIQUE), `jobPostId`, `status` | Candidate application uniqueness and pipeline filtering |
| `CandidateHybridIndex` | `applicationId` (UNIQUE), `(organizationId, jobPostId)` | Multi-tenant hybrid vector & full-text search isolation |
| `Interview` | `organizationId`, `applicationId`, `candidateId`, `status`, `startTime` | Multi-tenant calendar scheduling and candidate timeline |
| `AuditLog` | `userId`, `organizationId`, `(organizationId, createdAt)` | Tenant-scoped security audit trail |
