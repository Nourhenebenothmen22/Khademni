# Khademni ATS — Frontend Application

Production-grade SaaS Web Application built with **Next.js 16 (App Router)**, **TypeScript 5**, **Tailwind CSS v4**, and **TanStack Query v5**, interfacing strictly with the **Khademni Teacher Recruitment Platform Backend**.

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture & Folder Structure](#architecture--folder-structure)
- [Implemented Routes & Pages (38 Routes)](#implemented-routes--pages-38-routes)
- [API Integration & Security](#api-integration--security)
- [Multi-Tenant & Role Authorization](#multi-tenant--role-authorization)
- [Environment Variables](#environment-variables)
- [Local Development & Commands](#local-development--commands)
- [Production Deployment](#production-deployment)

---

## Overview

Khademni ATS is an intelligent teacher recruitment SaaS platform designed to streamline candidate ingestion, job post publishing, explainable vector AI matching (384d dense ONNX embeddings + full-text search), structured interview scheduling with iCalendar support, and multi-tenant institution administration.

- **100% Real API Mapping**: Every UI view, table, and form connects directly to a live backend endpoint.
- **Multi-Tenant Scoping**: All admin requests automatically propagate tenant context (`X-Organization-Id`) and authenticate via HTTP-only JWTs.
- **Strict Role Enforcement**: Route guards distinguish between `CANDIDATE`, `ADMIN` (Tenant Admin / Recruiter), and `isSuperAdmin` (Platform Super Admin).

---

## Technology Stack

- **Framework**: Next.js 16.3 (App Router, Turbopack)
- **Language**: TypeScript 5 (Strict Mode)
- **Styling**: Tailwind CSS v4, `clsx`, `tailwind-merge`
- **Server State & Data Fetching**: TanStack React Query v5
- **UI Components & Icons**: Lucide React, Radix UI dialog primitives
- **Data Tables**: TanStack React Table v9
- **Data Visualization**: Recharts v3
- **Form Handling & Validation**: React Hook Form v7, Zod v3, `@hookform/resolvers`
- **File Ingestion**: `react-dropzone` v20
- **Toast Notifications**: Sonner v2
- **Date Formatting**: `date-fns` v4

---

## Architecture & Folder Structure

```text
frontend/
├── src/
│   ├── app/                         # Next.js 16 App Router Routes
│   │   ├── (public)/                # Public Crawlable Pages (SEO Enabled)
│   │   │   ├── jobs/                # Job Board & Job Detail pages with apply modal
│   │   │   └── docs/                # OpenAPI Documentation viewer
│   │   ├── (auth)/                  # Authentication Flow Pages
│   │   │   ├── login/               # Sign In page (MFA aware)
│   │   │   ├── register/            # Candidate Registration
│   │   │   ├── mfa/login/           # TOTP Verification screen
│   │   │   ├── verify-email/        # Email Token Confirmation
│   │   │   ├── forgot-password/     # Password Reset Request
│   │   │   └── reset-password/      # New Password Submission
│   │   ├── (candidate)/             # Candidate Dashboard Routes
│   │   │   └── candidate/           # Dashboard, Applications, Interviews, Document Viewer
│   │   ├── (admin)/                 # Admin ATS & AI Engine Routes
│   │   │   └── admin/               # Stats, Jobs CRUD, Applications, Interviews, AI Matching, Users, Orgs, Audits
│   │   ├── notifications/           # In-App Notifications Center
│   │   ├── org/me/                  # Tenant Organization Profile
│   │   ├── settings/                # Profile & MFA Configuration
│   │   ├── layout.tsx               # Root Layout with Query & Auth Providers
│   │   ├── page.tsx                 # Root Route (Redirects to /jobs)
│   │   └── not-found.tsx            # Custom 404 Error Page
│   ├── components/
│   │   ├── layout/                  # Header, Sidebar, DashboardShell
│   │   └── ui/                      # StatusBadge, ConfirmModal, UI Primitives
│   ├── features/                    # Modular API Services
│   │   ├── auth/                    # Auth endpoints (login, MFA, reset)
│   │   ├── jobs/                    # Job Posts, Keywords, Matching Rules APIs
│   │   ├── applications/            # Application Submissions & File Downloads APIs
│   │   ├── interviews/              # Interview Scheduling & Scorecards APIs
│   │   ├── matching/                # AI Matching Runs & BullMQ Queue Polling APIs
│   │   ├── ai-models/               # Benchmark Models & Evaluation Metrics APIs
│   │   ├── users/                   # Profile & User Directory APIs
│   │   ├── organizations/           # Multi-tenant Organizations APIs
│   │   ├── notifications/           # Notifications APIs
│   │   └── audit-logs/              # System Audit Logs & Admin Stats APIs
│   ├── lib/
│   │   ├── api/                     # Centralized fetch HTTP Client & Query Provider
│   │   ├── auth/                    # AuthContext Provider & Hooks
│   │   └── utils/                   # Class merging utilities (`cn`)
│   └── types/
│       └── backend.ts               # Strict TypeScript DTO contracts & Prisma enums
├── package.json
├── next.config.ts
└── tsconfig.json
```

---

## Implemented Routes & Pages (38 Routes)

### 1. Public Pages
| Route | Component File | Description |
|---|---|---|
| `/jobs` | `src/app/(public)/jobs/page.tsx` | Public teaching job board with search and pagination. |
| `/jobs/:id` | `src/app/(public)/jobs/[id]/page.tsx` | Job requirements detail & resume upload application modal. |
| `/docs` | `src/app/(public)/docs/page.tsx` | OpenAPI 3.0 dynamic specification viewer. |

### 2. Authentication Pages
| Route | Component File | Description |
|---|---|---|
| `/login` | `src/app/(auth)/login/page.tsx` | Sign-in form supporting MFA token redirection. |
| `/register` | `src/app/(auth)/register/page.tsx` | Candidate registration form. |
| `/mfa/login` | `src/app/(auth)/mfa/login/page.tsx` | 6-digit TOTP verification screen. |
| `/verify-email` | `src/app/(auth)/verify-email/page.tsx` | Email confirmation landing page. |
| `/forgot-password` | `src/app/(auth)/forgot-password/page.tsx` | Password reset link request. |
| `/reset-password` | `src/app/(auth)/reset-password/page.tsx` | New password execution form. |

### 3. Candidate Pages
| Route | Component File | Description |
|---|---|---|
| `/candidate/dashboard` | `src/app/(candidate)/candidate/dashboard/page.tsx` | Candidate overview, application stats & upcoming interviews. |
| `/candidate/applications` | `src/app/(candidate)/candidate/applications/page.tsx` | Application history & tracking codes. |
| `/candidate/interviews` | `src/app/(candidate)/candidate/interviews/page.tsx` | Scheduled interviews & iCalendar (`.ics`) download. |
| `/candidate/applications/:id/documents/:docId` | `src/app/(candidate)/candidate/applications/[id]/documents/[docId]/page.tsx` | Attachment viewer & download trigger. |

### 4. Admin ATS & AI Engine Pages
| Route | Component File | Description |
|---|---|---|
| `/admin/dashboard` | `src/app/(admin)/admin/dashboard/page.tsx` | Recruitment pipeline KPIs & conversion metrics. |
| `/admin/jobs` | `src/app/(admin)/admin/jobs/page.tsx` | Job openings directory table & search. |
| `/admin/jobs/new` | `src/app/(admin)/admin/jobs/new/page.tsx` | Job post creator. |
| `/admin/jobs/:id` | `src/app/(admin)/admin/jobs/[id]/page.tsx` | Job post detail view. |
| `/admin/jobs/:id/edit` | `src/app/(admin)/admin/jobs/[id]/edit/page.tsx` | Job post editor, Keywords, and Rules Engine configurator. |
| `/admin/applications` | `src/app/(admin)/admin/applications/page.tsx` | Submissions review & status transition controls. |
| `/admin/interviews` | `src/app/(admin)/admin/interviews/page.tsx` | Interview scheduling & scorecard evaluation manager. |
| `/admin/matching` | `src/app/(admin)/admin/matching/page.tsx` | AI batch matching trigger & async queue progress bar. |
| `/admin/matching/runs/:id` | `src/app/(admin)/admin/matching/runs/[id]/page.tsx` | Matching run breakdown details. |
| `/admin/matching/scores/:applicationId` | `src/app/(admin)/admin/matching/scores/[applicationId]/page.tsx` | Explainable fit breakdown, matched/missing keywords. |
| `/admin/ai-models` | `src/app/(admin)/admin/ai-models/page.tsx` | Global AI model registry (**Super Admin Only**). |
| `/admin/ai-models/:modelId/evaluations` | `src/app/(admin)/admin/ai-models/[modelId]/evaluations/page.tsx` | Benchmark evaluation datasets (**Super Admin Only**). |
| `/admin/ai-models/:modelId/evaluations/:id` | `src/app/(admin)/admin/ai-models/[modelId]/evaluations/[id]/page.tsx` | Benchmark metrics: Precision, Recall, F1, NDCG@5. |
| `/admin/users` | `src/app/(admin)/admin/users/page.tsx` | Organization user account directory. |
| `/admin/users/:id` | `src/app/(admin)/admin/users/[id]/page.tsx` | User profile & active status toggle. |
| `/admin/organizations` | `src/app/(admin)/admin/organizations/page.tsx` | Multi-tenant organization directory. |
| `/admin/organizations/:id` | `src/app/(admin)/admin/organizations/[id]/page.tsx` | Organization tenant details. |
| `/admin/audit-logs` | `src/app/(admin)/admin/audit-logs/page.tsx` | Immutable platform audit log viewer. |

### 5. Settings & Profile Pages
| Route | Component File | Description |
|---|---|---|
| `/notifications` | `src/app/notifications/page.tsx` | In-app notification center. |
| `/org/me` | `src/app/org/me/page.tsx` | Tenant institution profile & logo upload. |
| `/settings/profile` | `src/app/settings/profile/page.tsx` | User profile info & password update. |
| `/settings/mfa` | `src/app/settings/mfa/page.tsx` | TOTP QR code setup & 2FA activation. |
| `/*` (404) | `src/app/not-found.tsx` | Custom 404 error page. |

---

## API Integration & Security

- **Centralized Client** ([`src/lib/api/client.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/frontend/src/lib/api/client.ts)): Auto-attaches Bearer access tokens, injects `X-CSRF-Token` headers for state-changing requests, and automatically handles silent 401 token refresh rotation.
- **Tenant Context Propagation**: Admin requests send `X-Organization-Id` to keep multi-tenant queries securely bounded.

---

## Environment Variables

| Variable | Default Value | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | Backend REST API endpoint URL |

---

## Local Development & Commands

```powershell
# Install dependencies
npm install

# Start Next.js dev server
npm run dev

# Run TypeScript type check
npx tsc --noEmit

# Run ESLint validation
npm run lint

# Compile production standalone build
npm run build

# Start production server
npm start
```
