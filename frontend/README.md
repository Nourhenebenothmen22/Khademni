# Khademni ATS — Frontend Application

Production-grade SaaS Web Application built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **TanStack Query**, interfacing strictly with the **Khademni Teacher Recruitment Platform Backend**.

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture & Folder Structure](#architecture--folder-structure)
- [Implemented Routes & Pages](#implemented-routes--pages)
- [API Integration & Centralized Architecture](#api-integration--centralized-architecture)
- [Authentication, MFA & Security](#authentication-mfa--security)
- [Authorization & Multi-Tenant Isolation](#authorization--multi-tenant-isolation)
- [Server State & Caching](#server-state--caching)
- [Forms & File Handling](#forms--file-handling)
- [AI Matching Engine & Queue Polling](#ai-matching-engine--queue-polling)
- [UX States & Design System](#ux-states--design-system)
- [SEO Strategy](#seo-strategy)
- [Environment Variables](#environment-variables)
- [Local Development & Commands](#local-development--commands)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Production Deployment](#production-deployment)

---

## Overview

Khademni ATS is an intelligent teacher recruitment SaaS platform designed to streamline candidate ingestion, job post publishing, explainable vector AI matching (384d dense embeddings + full-text search), interview scheduling, and multi-tenant school administration.

The frontend is built as a zero-hallucination client:
- **100% API Mapping**: Every feature corresponds directly to a real backend REST endpoint.
- **Strict Role Enforcement**: Protects routes using actual backend `UserRole` values (`CANDIDATE` and `ADMIN`).
- **No Mock Billing / Invented Roles**: Facturation and unexposed roles are omitted in complete alignment with backend models.

---

## Technology Stack

- **Framework**: Next.js 16.3.0 (App Router, Turbopack)
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
│   │   │   ├── jobs/                # Job Board & Job Detail pages
│   │   │   └── docs/                # OpenAPI Documentation viewer
│   │   ├── (auth)/                  # Authentication Flow Pages
│   │   │   ├── login/               # Sign In page (MFA aware)
│   │   │   ├── register/            # Candidate Registration
│   │   │   ├── mfa/login/           # TOTP Verification
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

## Implemented Routes & Pages

### 1. Public Pages (3)
| Route | Component File | Description |
| :--- | :--- | :--- |
| `/jobs` | `src/app/(public)/jobs/page.tsx` | Public teaching job board with search and pagination. |
| `/jobs/:id` | `src/app/(public)/jobs/[id]/page.tsx` | Job requirements detail & PDF/Docx CV dropzone form. |
| `/docs` | `src/app/(public)/docs/page.tsx` | OpenAPI 3.0 dynamic specification viewer. |

### 2. Authentication Pages (6)
| Route | Component File | Description |
| :--- | :--- | :--- |
| `/login` | `src/app/(auth)/login/page.tsx` | Sign-in form supporting MFA token redirection. |
| `/register` | `src/app/(auth)/register/page.tsx` | Candidate registration form. |
| `/mfa/login` | `src/app/(auth)/mfa/login/page.tsx` | 6-digit TOTP verification screen. |
| `/verify-email` | `src/app/(auth)/verify-email/page.tsx` | Email confirmation landing page. |
| `/forgot-password` | `src/app/(auth)/forgot-password/page.tsx` | Password reset link request. |
| `/reset-password` | `src/app/(auth)/reset-password/page.tsx` | New password execution form. |

### 3. Candidate Pages (4)
| Route | Component File | Description |
| :--- | :--- | :--- |
| `/candidate/dashboard` | `src/app/(candidate)/candidate/dashboard/page.tsx` | Candidate overview & recent applications status. |
| `/candidate/applications` | `src/app/(candidate)/candidate/applications/page.tsx` | Application history & withdrawal controls. |
| `/candidate/interviews` | `src/app/(candidate)/candidate/interviews/page.tsx` | Candidate scheduled interview sessions. |
| `/candidate/applications/:id/documents/:docId` | `src/app/(candidate)/candidate/applications/[id]/documents/[docId]/page.tsx` | Attachment viewer & download trigger. |

### 4. Admin ATS & AI Engine Pages (14)
| Route | Component File | Description |
| :--- | :--- | :--- |
| `/admin/dashboard` | `src/app/(admin)/admin/dashboard/page.tsx` | Recharts application status breakdown & stats. |
| `/admin/jobs` | `src/app/(admin)/admin/jobs/page.tsx` | Job openings directory table & search. |
| `/admin/jobs/new` | `src/app/(admin)/admin/jobs/new/page.tsx` | Job post creator. |
| `/admin/jobs/:id/edit` | `src/app/(admin)/admin/jobs/[id]/edit/page.tsx` | Job post editor, Keywords, and Rules Engine configurator. |
| `/admin/applications` | `src/app/(admin)/admin/applications/page.tsx` | Submissions ingestion & status transition controls. |
| `/admin/interviews` | `src/app/(admin)/admin/interviews/page.tsx` | Admin interview scheduling & interviewer assignment manager. |
| `/admin/matching` | `src/app/(admin)/admin/matching/page.tsx` | AI batch matching trigger & 2s Polling Queue Progress Bar. |
| `/admin/matching/runs/:id` | `src/app/(admin)/admin/matching/runs/[id]/page.tsx` | Matching run breakdown details. |
| `/admin/matching/scores/:applicationId` | `src/app/(admin)/admin/matching/scores/[applicationId]/page.tsx` | Explainable fit breakdown, matched/missing keywords. |
| `/admin/ai-models` | `src/app/(admin)/admin/ai-models/page.tsx` | Benchmark model registry & active switch (`requireSuperAdmin`). |
| `/admin/ai-models/:modelId/evaluations/:id` | `src/app/(admin)/admin/ai-models/[modelId]/evaluations/[id]/page.tsx` | Benchmark metrics (Precision, Recall, F1, MRR). |
| `/admin/users` | `src/app/(admin)/admin/users/page.tsx` | User account directory & role filters. |
| `/admin/users/:id` | `src/app/(admin)/admin/users/[id]/page.tsx` | User profile & active status toggle. |
| `/admin/organizations` | `src/app/(admin)/admin/organizations/page.tsx` | Multi-tenant organization directory. |
| `/admin/organizations/:id` | `src/app/(admin)/admin/organizations/[id]/page.tsx` | Organization tenant detail. |
| `/admin/audit-logs` | `src/app/(admin)/admin/audit-logs/page.tsx` | System audit log viewer. |

### 5. Authenticated Settings & System Pages (5)
| Route | Component File | Description |
| :--- | :--- | :--- |
| `/notifications` | `src/app/notifications/page.tsx` | Notifications center with mark-all-read. |
| `/org/me` | `src/app/org/me/page.tsx` | Current authenticated organization context. |
| `/settings/profile` | `src/app/settings/profile/page.tsx` | Profile information & password change. |
| `/settings/mfa` | `src/app/settings/mfa/page.tsx` | TOTP secret & QR code configuration. |
| `/*` (404) | `src/app/not-found.tsx` | Custom 404 Not Found error page. |

---

## Local Development & Commands

Run commands from the `frontend/` directory:

```bash
# Install dependencies
npm install

# Start Next.js development server
npm run dev

# Run TypeScript typecheck
npx tsc --noEmit

# Run ESLint check
npm run lint

# Build production bundle
npm run build

# Start production server
npm start
```
