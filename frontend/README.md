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
- [Known Limitations & Dependencies](#known-limitations--dependencies)

---

## Overview

Khademni ATS is an intelligent teacher recruitment SaaS platform designed to streamline candidate ingestion, job post publishing, explainable vector AI matching (384d dense embeddings + BM25 sparse RRF), and multi-tenant school administration.

The frontend is built as a zero-hallucination client:
- **100% API Mapping**: Every feature corresponds directly to a real backend REST endpoint.
- **Strict Role Enforcement**: Protects routes using actual backend `UserRole` values (`CANDIDATE` and `ADMIN`).
- **No Mock Billing / Invented Roles**: Facturation and unexposed roles (e.g. `RECRUITER`) are omitted in complete alignment with backend models.

---

## Technology Stack

- **Framework**: Next.js 16.3.0 (App Router, Turbopack)
- **Language**: TypeScript 5 (Strict Mode)
- **Styling**: Tailwind CSS v4, `clsx`, `tailwind-merge`
- **Server State & Data Fetching**: TanStack React Query v5
- **UI Components & Icons**: Lucide React
- **Data Tables**: TanStack React Table v9
- **Data Visualization**: Recharts v3
- **Form Handling & Validation**: React Hook Form v7, Zod v3, `@hookform/resolvers`
- **File Ingestion**: `react-dropzone` v20
- **Toast Notifications**: Sonner v2
- **Date Formatting**: `date-fns` v4

---

## Architecture & Folder Structure

The project follows a feature-driven modular structure isolating API services, UI components, and Next.js page routes:

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
│   │   │   └── candidate/           # Dashboard, Applications, Document Viewer
│   │   ├── (admin)/                 # Admin ATS & AI Engine Routes
│   │   │   └── admin/               # Stats, Jobs CRUD, Applications, AI Matching, Users, Orgs, Audits
│   │   ├── notifications/           # In-App Notifications Center
│   │   ├── org/me/                  # Tenant Organization Profile
│   │   ├── settings/                # Profile & MFA Configuration
│   │   ├── layout.tsx               # Root Layout with Query & Auth Providers
│   │   ├── page.tsx                 # Root Route (Redirects to /jobs)
│   │   └── not-found.tsx            # Custom 404 Error Page
│   ├── components/
│   │   ├── layout/                  # Header, Sidebar, DashboardShell
│   │   └── ui/                      # StatusBadge, UI Primitives
│   ├── features/                    # Modular API Services
│   │   ├── auth/                    # Auth endpoints (login, MFA, reset)
│   │   ├── jobs/                    # Job Posts, Keywords, Matching Rules APIs
│   │   ├── applications/            # Application Submissions & File Downloads APIs
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
| `/docs` | `src/app/(public)/docs/page.tsx` | OpenAPI 3.0 interactive specification viewer. |

### 2. Authentication Pages (6)
| Route | Component File | Description |
| :--- | :--- | :--- |
| `/login` | `src/app/(auth)/login/page.tsx` | Sign-in form supporting MFA token redirection. |
| `/register` | `src/app/(auth)/register/page.tsx` | Candidate registration form. |
| `/mfa/login` | `src/app/(auth)/mfa/login/page.tsx` | 6-digit TOTP verification screen. |
| `/verify-email` | `src/app/(auth)/verify-email/page.tsx` | Email confirmation landing page. |
| `/forgot-password` | `src/app/(auth)/forgot-password/page.tsx` | Password reset link request. |
| `/reset-password` | `src/app/(auth)/reset-password/page.tsx` | New password execution form. |

### 3. Candidate Pages (3)
| Route | Component File | Description |
| :--- | :--- | :--- |
| `/candidate/dashboard` | `src/app/(candidate)/candidate/dashboard/page.tsx` | Candidate overview & recent applications status. |
| `/candidate/applications` | `src/app/(candidate)/candidate/applications/page.tsx` | Application history & withdrawal controls. |
| `/candidate/applications/:id/documents/:docId` | `src/app/(candidate)/candidate/applications/[id]/documents/[docId]/page.tsx` | Attachment viewer & download trigger. |

### 4. Admin ATS & AI Engine Pages (13)
| Route | Component File | Description |
| :--- | :--- | :--- |
| `/admin/dashboard` | `src/app/(admin)/admin/dashboard/page.tsx` | Recharts application status breakdown & stats. |
| `/admin/jobs` | `src/app/(admin)/admin/jobs/page.tsx` | Job openings directory table & search. |
| `/admin/jobs/new` | `src/app/(admin)/admin/jobs/new/page.tsx` | Job post creator. |
| `/admin/jobs/:id/edit` | `src/app/(admin)/admin/jobs/[id]/edit/page.tsx` | Job post editor, Keywords, and Rules Engine configurator. |
| `/admin/applications` | `src/app/(admin)/admin/applications/page.tsx` | Submissions ingestion & status transition controls. |
| `/admin/matching` | `src/app/(admin)/admin/matching/page.tsx` | AI batch matching trigger & 2s Polling Queue Progress Bar. |
| `/admin/matching/runs/:id` | `src/app/(admin)/admin/matching/runs/[id]/page.tsx` | Matching run breakdown details. |
| `/admin/matching/scores/:applicationId` | `src/app/(admin)/admin/matching/scores/[applicationId]/page.tsx` | Explainable fit breakdown, matched/missing keywords. |
| `/admin/ai-models` | `src/app/(admin)/admin/ai-models/page.tsx` | Benchmark model registry & active switch. |
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

## API Integration & Centralized Architecture

All HTTP interaction is routed through `src/lib/api/client.ts`:

- **Base URL Resolution**: Configured via `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3000/api/v1`).
- **CSRF Token Injection**: Automatically fetches CSRF secret from `/auth/csrf` and attaches `X-CSRF-Token` headers to all mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Bearer Token Authorization**: Injects `Authorization: Bearer <token>` dynamically.
- **Automatic 401 Token Refresh**: Intercepts `401 Unauthorized` responses and automatically triggers `POST /api/v1/auth/refresh` to rotate tokens without breaking user sessions.

---

## Authentication, MFA & Security

- **Authentication State**: Managed via `AuthProvider` (`src/lib/auth/auth-context.tsx`).
- **Two-Factor Authentication (MFA)**: Supports Google Authenticator/Authy TOTP. Redirects login flow to `/mfa/login` when `mfaRequired: true`.
- **MFA Setup**: Generates secret and QR Code via `POST /api/v1/auth/mfa/setup` and validates 6-digit codes via `POST /api/v1/auth/mfa/verify`.

---

## Authorization & Multi-Tenant Isolation

- **Role Protection**: Enforced by `DashboardShell` (`src/components/layout/dashboard-shell.tsx`). Only users with `user.role === 'ADMIN'` can access `/admin/*` routes.
- **Tenant Context**: Multi-tenancy is handled authoritatively by the backend using JWT context and cookies. The frontend displays active organization details (`/org/me`) without manually manipulating tenant headers.

---

## Server State & Caching

Managed via **TanStack React Query v5**:
- `staleTime`: 1 minute default stale window.
- `refetchOnWindowFocus`: Disabled for predictable UI performance.
- **Query Invalidation**: Mutations call `queryClient.invalidateQueries` on specific query keys (e.g. `["adminJobs"]`, `["myApplicationsList"]`).

---

## Forms & File Handling

- **Candidate Ingestion**: Uses `react-dropzone` on `/jobs/:id` for PDF and DOCX file uploads.
- **Multipart Processing**: Submits candidate CV files as `multipart/form-data` directly to `POST /api/v1/jobs/:jobId/apply`.
- **Binary Downloads**: Documents are streamed via `/api/v1/applications/:id/documents/:docId/download`.

---

## AI Matching Engine & Queue Polling

- **Execution Types**: Admin can trigger instant synchronous runs (`POST /matching/run-job/:jobPostId`) or asynchronous queue jobs (`POST /matching/queue-job/:jobPostId`).
- **Real-Time Polling**: When an async queue job is active, `useQuery` polls `GET /matching/queue-status/:queueJobId` every **2 seconds** until `status === 'completed'` or `failed`.
- **Explainability UI**: `/admin/matching/scores/:applicationId` displays matched/missing keyword badges, rule engine pass/fail results, 384d dense PGVector similarity, and AI confidence metrics.

---

## UX States & Design System

Every API-driven view includes explicit handlers for:
1. **Initial & Skeleton Loading**: Pulse skeletons for grids and tables.
2. **Empty States**: Meaningful placeholders when lists contain 0 items.
3. **API Errors**: Clean alert boxes notifying users of network/server failures.
4. **Toast Feedback**: Real-time action feedback via `sonner`.

---

## SEO Strategy

Public crawlable pages (`/jobs`, `/jobs/:id`, `/docs`) use Next.js server metadata:
- Dynamic page title and description tags.
- Open Graph tags.
- Indexing rules (`robots: { index: true, follow: true }`).
- Authenticated dashboard routes (`/candidate/*`, `/admin/*`) are kept private from search engines.

---

## Environment Variables

Create `.env.local` in the `frontend/` directory:

```env
# Backend API Base URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

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

---

## Testing & Quality Assurance

- **TypeScript Typecheck**: Verified with `npx tsc --noEmit` (**0 errors**).
- **Linter Check**: Verified with `npm run lint` (**0 errors**).
- **Production Build**: Verified with `npm run build` (**33 routes compiled successfully**).
- **E2E & Integration Testing**: `Playwright` and `MSW` testing suites are planned for future CI expansion (`TODO`).

---

## Security Considerations

- **XSS Protection**: Inputs rendered safely via React JSX escaping.
- **CSRF Token Handling**: Double submit cookie verification.
- **Credential Storage**: Bearer tokens held in memory state; refresh tokens stored in HTTP-Only cookies managed by the backend.

---

## Known Limitations & Backend Dependencies

1. **Facturation / Subscriptions**: Unsupported by backend models; billing pages are omitted.
2. **WebSockets / SSE**: Real-time notifications and queue progress rely on REST polling.
3. **Backend PostgreSQL Dependency**: AI vector search requires the `pgvector` extension enabled on the database.
