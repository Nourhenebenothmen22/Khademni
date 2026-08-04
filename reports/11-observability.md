# Sub-Agent 11 — Logging & Monitoring Audit

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Scope**: Logging Frameworks, Structured Log Output, Redaction Policies, Health Checks, Distributed Tracing, Metrics, and Error Monitoring.

---

## 1. Structured Logging Engine

Logging is powered by **Pino** (`pino` and `pino-http`), delivering structured JSON logs with high performance and low CPU overhead ([logger.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/lib/logger.ts)).

```typescript
import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
});
```

- **Log Level**: Configured via the `LOG_LEVEL` environment variable (validated by Zod as one of `fatal | error | warn | info | debug | trace`, default `info`).

### Automatic Sensitive Data Redaction
Http request logging config in `security.middleware.ts` automatically redacts sensitive authentication credentials before writing logs to `stdout`:

```typescript
redact: {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    "req.headers['x-csrf-token']"
  ],
  censor: "[REDACTED]"
}
```

---

## 2. Distributed Tracing & Request ID Propagation

- **Middleware**: `app.use((req, res, next) => ...)` ([app.ts:L34-L40](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/app.ts#L34-L40)).
- **Mechanism**: Reads existing `X-Request-ID` header from incoming load balancers or generates a new `crypto.randomUUID()`.
- **Response Binding**: Injects `X-Request-ID` header into every HTTP response, enabling end-to-end log aggregation across microservices.

---

## 3. Health Checks & Database Diagnostics

The system exposes an enhanced health check endpoint at `GET /health` ([app.ts:L48-L63](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/app.ts#L48-L63)):

- **Database Ping**: Executes `prisma.$queryRaw\`SELECT 1\``.
- **Healthy Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-08-04T18:30:00.000Z",
    "database": "connected"
  }
  ```
- **Unhealthy Response (503 Service Unavailable)**: Returned if PostgreSQL is unreachable.

---

## 4. Administrative Overview & Metrics Endpoint

Administrators can retrieve real-time system overview metrics via `GET /api/v1/admin/overview` ([admin.controller.ts](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/modules/admin/admin.controller.ts)), which reports:
- Total registered candidates & recruiters.
- Active published job postings.
- Total submitted job applications.
- Total AI matching runs completed.
- Recent audit logs with IP addresses and action types.
