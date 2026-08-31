# Sub-Agent 14 — Technical Documentation & Architecture Manual

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Status**: Verified & Synchronized with Current Codebase  
**Scope**: Complete System Architecture Manual, Execution Lifecycle, Module Dependencies, Data Flow Pipelines, and Architectural Visualizations (Mermaid Diagrams).

---

## 1. System Architecture Overview

The **Intelligent Teacher Recruitment Platform** backend is an enterprise Node.js 22 / TypeScript application designed for automated candidate screening, explainable hybrid vector AI matching, and multi-tenant recruitment management. It features an in-process AI engine combining local ONNX transformer embeddings (`Xenova/all-MiniLM-L6-v2`), PostgreSQL `pgvector`, `tsvector` full-text search with Reciprocal Rank Fusion (RRF), Cross-Attention reranking, and structured interview scheduling with iCalendar support.

---

## 2. Mermaid Visualizations

### 1. Project Directory Topology Diagram
```mermaid
graph TD
    Root["backend/"] --> Src["src/"]
    Root --> Prisma["prisma/"]
    Root --> Scripts["scripts/"]
    
    Src --> App["app.ts (Express Setup)"]
    Src --> Index["index.ts (Server Bootstrap)"]
    Src --> Common["common/"]
    Src --> Config["config/"]
    Src --> Lib["lib/"]
    Src --> Modules["modules/"]
    
    Common --> Middlewares["middlewares/ (Auth, CSRF, RateLimit, Tenant, Magic-Byte Upload, Error)"]
    Common --> Validators["validators/ (Zod Schemas)"]
    Common --> Errors["errors/ (AppError)"]
    Common --> Utils["utils/ (asyncHandler)"]
    
    Lib --> JWT["jwt.ts"]
    Lib --> Password["password.ts (Argon2)"]
    Lib --> Encryption["encryption.ts (AES-256-GCM)"]
    Lib --> RedisLib["redis.ts (ioredis)"]
    Lib --> Storage["file-storage.ts"]
    Lib --> PrismaLib["prisma.ts (Client Singleton)"]
    Lib --> EmailLib["email.ts (Brevo SMTP)"]
    Lib --> AuditLib["audit.ts"]
    
    Modules --> AdminMod["admin/"]
    Modules --> AIMod["ai-models/"]
    Modules --> AppsMod["applications/"]
    Modules --> AuthMod["auth/"]
    Modules --> InterviewsMod["interviews/"]
    Modules --> JobsMod["jobs/"]
    Modules --> MatchMod["matching/"]
    Modules --> NotifMod["notifications/"]
    Modules --> OrgsMod["organizations/"]
    Modules --> UsersMod["users/"]
```

---

### 2. Complete Database Entity Relationship Diagram (23 Models)

```mermaid
erDiagram
    Organization ||--o{ User : "members"
    Organization ||--o{ JobPost : "vacancies"
    Organization ||--o{ AuditLog : "audit_logs"
    Organization ||--o{ Interview : "interviews"
    Organization ||--o{ OrganizationProviderConfig : "providers"
    Organization ||--o{ CandidateHybridIndex : "hybrid_indices"

    User ||--o{ AuthSession : "sessions"
    User ||--o{ JobPost : "created_jobs"
    User ||--o{ Application : "candidate_applications"
    User ||--o{ Interview : "candidate_interviews"
    User ||--o{ InterviewerAssignment : "interviewer_assignments"
    User ||--o{ InterviewScorecard : "scorecards"
    User ||--o{ Notification : "notifications"
    User ||--o{ AuditLog : "audit_logs"

    JobPost ||--o{ JobKeyword : "keywords"
    JobPost ||--o{ JobMatchingRule : "rules"
    JobPost ||--o{ Application : "applications"
    JobPost ||--o{ CandidateHybridIndex : "hybrid_indices"

    Application ||--o{ ApplicationDocument : "documents"
    Application ||--o{ ApplicationStatusHistory : "status_history"
    Application ||--o{ MatchingRun : "matching_runs"
    Application ||--o| ApplicationScore : "score"
    Application ||--o{ Interview : "interviews"
    Application ||--o| CandidateHybridIndex : "hybrid_index"

    ApplicationDocument ||--o| DocumentParseResult : "parse_result"

    AIMatchingModel ||--o{ MatchingRun : "runs"
    AIMatchingModel ||--o{ AIMatchingModelEvaluation : "evaluations"

    AIMatchingModelEvaluation ||--o{ AIMatchingMetric : "metrics"

    Interview ||--o{ InterviewerAssignment : "interviewers"
    Interview ||--o{ InterviewScorecard : "scorecards"

    InterviewScorecard ||--o{ ScorecardCriteriaScore : "criteria_scores"
```

---

### 3. End-to-End Real-Life Recruitment Workflow Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Candidate
    actor Recruiter as Org Admin / Recruiter
    participant Web as Next.js Frontend
    participant API as Express Backend
    participant ONNX as Local ONNX Engine
    participant DB as PostgreSQL + pgvector
    participant Mail as Brevo SMTP

    Recruiter->>Web: Create & Publish Job Post (Keywords + Rules)
    Web->>API: POST /api/v1/jobs
    API->>ONNX: Generate 384d Dense Vector
    API->>DB: Save JobPost + embedding
    
    Candidate->>Web: Apply to Job with CV (PDF)
    Web->>API: POST /api/v1/jobs/:id/apply (multipart)
    API->>API: In-Memory Magic-Byte Validation
    API->>ONNX: Generate 384d Dense Vector for CV
    API->>DB: Save Application + CandidateHybridIndex
    
    Recruiter->>Web: Trigger AI Matching
    Web->>API: POST /api/v1/matching/run
    API->>DB: Execute pgvector + tsvector RRF Query
    API->>API: Evaluate Rules & Cross-Attention Reranking
    API-->>Web: Return Ranked Candidates Breakdown
    
    Recruiter->>Web: Schedule Interview with Candidate
    Web->>API: POST /api/v1/interviews
    API->>API: Generate RFC 5545 .ics Calendar File
    API->>Mail: Send Brevo Invitation with Meeting Link & .ics
    API-->>Web: 201 Interview Scheduled
    
    Recruiter->>Web: Submit Interview Scorecard
    Web->>API: POST /api/v1/interviews/:id/scorecards
    API->>DB: Save Scorecard & Advance Application Status
```
