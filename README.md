# Intelligent Teacher Recruitment Platform

Production-grade, scalable, and secure **Intelligent Teacher Recruitment Platform**, featuring an **Express v5 / Node.js 22 TypeScript Backend API, PostgreSQL 16 database with pgvector, and a dynamic hybrid AI matching engine**.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v22.0.0 or higher
- **PostgreSQL**: v16 with `pgvector` extension
- **npm**: v10.0.0 or higher

### 2. Setup Backend API
```bash
cd apps/backend
npm install
cp .env.example .env
npx prisma db push
npx prisma generate
npm run dev
```

The backend server will run on `http://localhost:3000`.  
Swagger API Documentation is available at `http://localhost:3000/docs`.

---

## 📦 Project Structure

```text
intelligent-teacher-recruitment-platform/
└── apps/
    └── backend/                    # Node.js 22 + Express v5 + TypeScript REST API
        ├── prisma/                 # PostgreSQL Prisma Schema & Migrations
        ├── scripts/                # E2E Integration Test Suite & Utilities
        ├── src/
        │   ├── config/             # Environment, Swagger & OpenAPI Configuration
        │   ├── lib/                # Storage, Email, Audit, Secrets & Cache Utilities
        │   ├── common/             # Middlewares, Validators & Error Handlers
        │   └── modules/            # Clean Architecture Domain Modules
        │       ├── admin/          # Admin Dashboard & Audit Log APIs
        │       ├── ai-models/      # AI Models & Metric Evaluation APIs
        │       ├── applications/   # Candidate Application Pipeline APIs
        │       ├── auth/           # Auth, MFA, Password Reset & Session APIs
        │       ├── jobs/           # Job Post, Keyword & Matching Rule APIs
        │       ├── matching/       # AI Hybrid Matching Engine & Queue APIs
        │       └── notifications/  # Candidate In-App Notification APIs
        ├── README.md               # Detailed Backend Technical Documentation
        └── docker-compose.yml      # Local Infrastructure Development Stack
```

---

## ⚡ Core Platform Features

- **Production-Grade Authentication**: Argon2 hashing, dual JWT rotation with breach detection, TOTP 2FA, password reset, rate limiting, and CSRF Double Submit Cookie protection.
- **Dynamic AI Matching Engine**: 100% database-driven matching engine combining rule-based deterministic scoring with dense vector cosine similarity (`pgvector` / TF-IDF). Zero hardcoded scoring rules or weights.
- **Asynchronous Background Processing**: Offloads heavy candidate batch ranking out of the HTTP lifecycle with real-time job status tracking.
- **State Machine Application Pipeline**: Candidate file upload streaming, SHA-256 file checksum deduplication, and application status transitions (`SUBMITTED` ➔ `UNDER_REVIEW` ➔ `SHORTLISTED` / `REJECTED` ➔ `ACCEPTED`).
- **Comprehensive Test Suite**: Automated end-to-end integration test suite verifying all 12 core workflow pipelines (`npx tsx scripts/integration-test.ts`).

---

## 📄 Documentation Links

- [Backend API Documentation (README.md)](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/apps/backend/README.md)
- [OpenAPI Specification (docs.json)](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/apps/backend/openapi.json)
