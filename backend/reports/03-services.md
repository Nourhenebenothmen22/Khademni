# Sub-Agent 3 — Business Logic Audit

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Scope**: Application Services, Use Cases, Core Business Rules, Reusable Domain Logic, and Dependency Injection Patterns.

---

## 1. Domain Service Mapping

The core business logic resides in service files located under `backend/src/modules/`:

| Module | Service File | Domain Capabilities & Use Cases |
| :--- | :--- | :--- |
| `auth` | [`auth.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/auth/auth.service.ts) | User registration with Argon2 hashing, email verification token generation, login session creation, access & refresh token issuance (with `organizationId` claim retention), transactional session rotation (`refreshSession`) with 10s grace period and optimistic claiming, MFA TOTP setup & verification, password reset workflows (with account lockout clearing `failedLoginAttempts: 0`, `lockedUntil: null`). |
| `users` | [`users.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/users/users.service.ts) | Profile CRUD (updates name & email; on email change, resets `isEmailVerified: false`, generates verification token, and re-dispatches verification email), user role updates, user lock/unlock, avatar URL generation (`getAvatarUrl`), disk presence checking in `getUserProfile`. |
| `jobs` | [`jobs.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/jobs/jobs.service.ts)<br>[`job-keywords.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/jobs/job-keywords.service.ts)<br>[`job-matching-rules.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/jobs/job-matching-rules.service.ts) | Multi-tenant job posting lifecycle management (DRAFT -> PUBLISHED -> CLOSED -> ARCHIVED) with mandatory `organizationId` scoping, keyword extraction & weighted assignments (REQUIRED, OPTIONAL, BONUS), structured rule definitions (EXPERIENCE, DEGREE, CERTIFICATION, KEYWORD, CUSTOM). |
| `applications` | [`applications.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/applications/applications.service.ts) | Job application submission with disk cleanup fallback, tracking code generation (`APP-XXXXXX`), application document storage, status transition validation (SUBMITTED -> UNDER_REVIEW -> SHORTLISTED/REJECTED -> ACCEPTED/WITHDRAWN) using atomic batch array transactions (`prisma.$transaction([op1, op2])`), tenant-scoped application listing (`getApplications`) and status updates (`updateApplicationStatus`). |
| `matching` | [`matching.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/matching/matching.service.ts)<br>[`document-parser.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/matching/document-parser.service.ts)<br>[`semantic-embedding.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/matching/semantic-embedding.service.ts)<br>[`matching-queue.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/matching/matching-queue.service.ts) | Tenant-scoped candidate CV parsing, keyword extraction, TF-IDF vectorization & cosine similarity computation, custom matching rule evaluation, weighted scoring synthesis, score recommendation ranking (HIGHLY_RECOMMENDED, RECOMMENDED, AVERAGE, NOT_RECOMMENDED), background batch queue processing with strict `job.organizationId === organizationId` tenant scoping. |
| `ai-models` | [`ai-models.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/ai-models/ai-models.service.ts)<br>[`evaluations.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/ai-models/evaluations.service.ts) | Model version registration, hyperparameter tuning, model activation toggling, evaluation metric logging (Precision, Recall, F1, NDCG@5, MAP, MRR). |
| `notifications` | [`notifications.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/notifications/notifications.service.ts) | Creation and lifecycle management of candidate & recruiter notifications. |
| `admin` | [`admin.service.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/admin/admin.service.ts) | Multi-tenant system metrics aggregation (`getDashboardStats`), tenant-scoped user management (`getUsers`, `getUserById`), atomic tenant-scoped status updates (`toggleUserActive`), tenant audit log queries (`getAuditLogs`). |

---

## 2. Key Business Rules & Workflows

### Candidate AI Matching & Scoring Algorithm (`matching.service.ts`)
The AI matching engine evaluates candidate CVs against Job Post requirements using a 3-part weighted score composition:

$$\text{Final Score} = (\text{Keyword Score} \times 0.40) + (\text{Rule Score} \times 0.35) + (\text{Semantic Score} \times 0.25)$$

1. **Keyword Match Score (40% Weight)**:
   - Evaluates presence of REQUIRED, OPTIONAL, and BONUS keywords in the candidate's parsed CV text.
   - Missing REQUIRED keywords introduce a penalty factor to total keyword score.
2. **Matching Rules Score (35% Weight)**:
   - Evaluates condition-based rules (e.g., minimum years of teaching experience, required master's degree, specific certification).
3. **Semantic Cosine Similarity Score (25% Weight)**:
   - Tokenizes and cleans job requirements and CV text, builds term-frequency vectors, computes L2 norms, and calculates exact cosine similarity score ([semantic-embedding.service.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/matching/semantic-embedding.service.ts#L73-L135)).

#### Score Recommendation Tier Mapping
- **Score $\ge 85.0$**: `HIGHLY_RECOMMENDED`
- **Score $\ge 70.0$**: `RECOMMENDED`
- **Score $\ge 50.0$**: `AVERAGE`
- **Score $< 50.0$**: `NOT_RECOMMENDED`

---

## 3. Application State Transitions & Transaction Management

Application state transitions are strictly governed by validated state machine rules ([applications.service.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/applications/applications.service.ts)):

```
                 ┌────────────────┐
                 │   SUBMITTED    │
                 └───────┬────────┘
                         │ (Review Started)
                         ▼
                 ┌────────────────┐
                 │  UNDER_REVIEW  │
                 └───────┬────────┘
            ┌────────────┴────────────┐
            ▼                         ▼
   ┌────────────────┐        ┌────────────────┐
   │  SHORTLISTED   │        │    REJECTED    │
   └───────┬────────┘        └────────────────┘
      ┌────┴────┐
      ▼         ▼
┌──────────┐ ┌──────────┐
│ ACCEPTED │ │WITHDRAWN │
└──────────┘ └──────────┘
```

- **Atomic Batch Array Transactions**: All multi-step database mutations (such as application creation, status history appending, and withdrawal state updates) use non-interactive batch array transactions `prisma.$transaction([op1, op2])`. This completely eliminates P2028 transaction connection timeouts under high load while guaranteeing ACID atomicity.

---

## 4. Reusable Logic & Dependency Injection

- **Prisma Client Singleton**: Services consume database queries via direct import of the central singleton `import { prisma } from "../../lib/prisma.js"`.
- **Infrastructure Services & Tenant-Aware Audit Logging**: Reusable domain functions such as `logAuditAction({ userId, organizationId, action, entityType, entityId, metadata })` ([audit.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/audit.ts#L18)) and `sendEmail()` ([email.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/email.ts)) operate as asynchronous fire-and-forget helpers, ensuring failure in audit logging or email sending does not crash primary HTTP transaction flows. `AuditLogInput` natively supports tenant context via `organizationId`.
