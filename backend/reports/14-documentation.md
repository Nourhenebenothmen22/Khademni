# Sub-Agent 14 — Technical Documentation & Architecture Manual

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Scope**: Complete System Architecture Manual, Execution Lifecycle, Module Dependencies, Data Flow Pipelines, and Architectural Visualizations (Mermaid Diagrams).

---

## 1. System Architecture Overview

The **Intelligent Teacher Recruitment Platform** backend is an enterprise Node.js/TypeScript application designed for automated candidate screening, candidate-job matching, and recruitment management. It features an offline hybrid AI engine combining TF-IDF vector space modeling, custom rule evaluation, and weighted keyword extraction.

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
    
    Common --> Middlewares["middlewares/ (Auth, CSRF, RateLimit, Tenant, Error)"]
    Common --> Validators["validators/ (Zod Schemas)"]
    Common --> Errors["errors/ (AppError)"]
    Common --> Utils["utils/ (asyncHandler)"]
    
    Lib --> JWT["jwt.ts"]
    Lib --> Password["password.ts (Argon2)"]
    Lib --> Storage["file-storage.ts"]
    Lib --> PrismaLib["prisma.ts (Client Singleton)"]
    Lib --> EmailLib["email.ts"]
    Lib --> AuditLib["audit.ts"]
    
    Modules --> AdminMod["admin/"]
    Modules --> AIMod["ai-models/"]
    Modules --> AppsMod["applications/"]
    Modules --> AuthMod["auth/"]
    Modules --> JobsMod["jobs/"]
    Modules --> MatchMod["matching/"]
    Modules --> NotifMod["notifications/"]
    Modules --> UsersMod["users/"]
```

---

### 2. Module Dependency Graph
```mermaid
graph LR
    AuthModule["auth"] --> UserModule["users"]
    AuthModule --> LibJWT["lib/jwt"]
    AuthModule --> LibPassword["lib/password"]
    
    JobModule["jobs"] --> PrismaClient["lib/prisma"]
    JobModule --> CacheLib["lib/cache"]
    
    AppModule["applications"] --> JobModule
    AppModule --> UserModule
    AppModule --> StorageLib["lib/file-storage"]
    
    MatchingModule["matching"] --> AppModule
    MatchingModule --> AIModelModule["ai-models"]
    MatchingModule --> TFIDFEngine["semantic-embedding.service"]
    MatchingModule --> DocParser["document-parser.service"]
    
    NotifModule["notifications"] --> UserModule
    NotifModule --> PrismaClient
    
    AdminModule["admin"] --> PrismaClient
    AdminModule --> AuditLib["lib/audit"]
```

---

### 3. Comprehensive Request Lifecycle Sequence Diagram
```mermaid
sequenceDiagram
    autonumber
    actor Client as Candidate / Recruiter Client
    participant Express as Express Router / App
    participant MW as Security & CSRF & Auth Middleware
    participant Val as Zod Validation Middleware
    participant Controller as Domain Controller
    participant Service as Domain Service
    participant DB as PostgreSQL (Prisma)

    Client->>Express: HTTP POST /api/v1/jobs/:jobId/apply
    Express->>MW: Apply Request ID & Security Headers
    Express->>MW: verifyCsrf (Double Submit Cookie Check)
    Express->>MW: authenticate (Verify Bearer / Cookie JWT)
    MW-->>Express: req.user attached
    Express->>Val: validateBody(createApplicationSchema)
    Val-->>Express: Input Payload Parsed & Validated
    Express->>Controller: applyToJobController(req, res)
    Controller->>Service: submitApplication(candidateId, jobId, file)
    Service->>DB: Save Application & Document Records
    DB-->>Service: Application Record Created
    Service-->>Controller: Return Tracking Code & App Data
    Controller-->>Client: 201 Created JSON Response
```

---

### 4. Authentication & JWT Session Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser / Mobile App
    participant AuthRouter as /api/v1/auth/login
    participant AuthService as auth.service.ts
    participant Argon2 as Argon2 Hasher
    participant JWT as Jose JWT Helper
    participant SessionDB as AuthSession Table

    User->>AuthRouter: POST credentials (email, password)
    AuthRouter->>AuthService: loginUser(email, password)
    AuthService->>Argon2: verifyPassword(password, user.passwordHash)
    Argon2-->>AuthService: Valid Password (true)
    AuthService->>JWT: signAccessToken(payload) -> 15m
    AuthService->>JWT: signRefreshToken(payload) -> 7d
    AuthService->>SessionDB: Store SHA-256 Refresh Token Hash
    AuthService-->>AuthRouter: Return Access & Refresh Tokens
    AuthRouter-->>User: Set access_token & refresh_token Cookies + JSON Payload
```

---

### 5. AI Candidate Matching & Scoring Pipeline
```mermaid
flowchart TD
    Start([Trigger Matching Run]) --> ParseCV[Document Parser: Extract Text & Structured Skills]
    ParseCV --> KeywordStep[Phase 1: Weighted Keyword Matching - 40%]
    ParseCV --> VectorStep[Phase 2: TF-IDF Vectorizer & Cosine Similarity - 25%]
    ParseCV --> RuleStep[Phase 3: Condition-Based Matching Rules - 35%]
    
    KeywordStep --> WeightedSum[Compute Aggregated Final Score: 0 - 100]
    VectorStep --> WeightedSum
    RuleStep --> WeightedSum
    
    WeightedSum --> TierCheck{Check Final Score}
    TierCheck -- Score >= 85 --> Tier1[HIGHLY_RECOMMENDED]
    TierCheck -- Score >= 70 --> Tier2[RECOMMENDED]
    TierCheck -- Score >= 50 --> Tier3[AVERAGE]
    TierCheck -- Score < 50 --> Tier4[NOT_RECOMMENDED]
    
    Tier1 --> SaveDB[Persist ApplicationScore & MatchingRun Record]
    Tier2 --> SaveDB
    Tier3 --> SaveDB
    Tier4 --> SaveDB
```

---

### 6. Database Entity-Relationship Diagram (ERD)
```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : employs
    ORGANIZATION ||--o{ JOB_POST : owns
    ORGANIZATION ||--o{ AUDIT_LOG : tracks
    USER ||--o{ AUTH_SESSION : maintains
    USER ||--o{ JOB_POST : creates
    USER ||--o{ APPLICATION : submits
    USER ||--o{ AUDIT_LOG : generates
    USER ||--o{ NOTIFICATION : receives
    JOB_POST ||--o{ JOB_KEYWORD : contains
    JOB_POST ||--o{ JOB_MATCHING_RULE : contains
    JOB_POST ||--o{ APPLICATION : receives
    APPLICATION ||--o{ APPLICATION_DOCUMENT : includes
    APPLICATION_DOCUMENT ||--|| DOCUMENT_PARSE_RESULT : has
    APPLICATION ||--o{ MATCHING_RUN : evaluates
    MATCHING_RUN ||--|| APPLICATION_SCORE : calculates
    AI_MATCHING_MODEL ||--o{ MATCHING_RUN : utilizes
```

---

## 3. Data Flow & Processing Lifecycle Summary

1. **Recruitment Configuration**: Recruiter creates a `JobPost`, attaches required/optional `JobKeyword` entries, and specifies `JobMatchingRule` conditions.
2. **Candidate Application**: Candidate submits an `Application` along with a CV file. The system parses text content via `document-parser.service.ts` and saves raw text to `DocumentParseResult`.
3. **AI Screening Execution**: Matching runs process candidate CV text against job requirements, calculating a 3-part composite score (Keywords 40%, Rules 35%, Cosine Similarity 25%).
4. **Ranking & Notification**: The final score and recommendation tier are saved to `ApplicationScore`, and a notification is dispatched to the candidate and recruiting manager.
