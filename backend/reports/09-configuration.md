# Sub-Agent 9 — Configuration Audit

**Target System**: Intelligent Teacher Recruitment Platform (Backend)  
**Analysis Date**: August 2026  
**Scope**: Environment Variables, Zod Configuration Validation, Docker Setup, Docker Compose, Build Pipeline, and Process Startup Sequence.

---

## 1. Environment Variable Schema & Validation

Configuration loading is strictly validated using Zod inside [`backend/src/config/env.ts`](file:///c:/full_stack%20projects/intelligent-teacher-recruitment-platform/backend/src/config/env.ts). If required environment variables are missing or incorrectly formatted during application boot, process execution halts immediately with explicit schema error diagnostic logs.

### Validated Configuration Properties

| Key | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development \| production \| test` | `development` | Deployment environment state |
| `PORT` | `number` | `3000` | HTTP server listening port |
| `LOG_LEVEL` | `fatal \| error \| warn \| info \| debug \| trace` | `info` | Pino log level |
| `CORS_ORIGIN` | `string` | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed CORS origins |
| `SLOW_QUERY_THRESHOLD_MS` | `number` | `300` | Slow query warning threshold in milliseconds |
| `DATABASE_URL` | `string` (url) | *Required* | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | `string` ($\ge 32$ chars) | *Required* | JWT Access Token signing key |
| `JWT_REFRESH_SECRET` | `string` ($\ge 32$ chars) | *Required* | JWT Refresh Token signing key |
| `REDIS_URL` | `string` (optional) | — | Redis URL for distributed rate limiting |
| `SECRETS_PROVIDER` | `env \| aws \| vault` | `env` | Secret manager driver provider |
| `CSRF_SECRET` | `string` | `khademni_csrf_secret_token_key_32chars` | CSRF token signing secret |
| `SMTP_HOST` | `string` (optional) | — | SMTP mail server hostname |
| `SMTP_PORT` | `number` | `587` | SMTP mail server port |
| `SMTP_USER` | `string` (optional) | — | SMTP mail authentication username |
| `SMTP_PASS` | `string` (optional) | — | SMTP mail authentication password |
| `SMTP_FROM` | `string` | `Khademni <noreply@khademni.com>` | Outgoing email sender address |
| `UPLOAD_DIR` | `string` | `./uploads` | Local filesystem upload directory |
| `APP_URL` | `string` | `http://localhost:3000` | Backend application URL |
| `FRONTEND_URL` | `string` | `http://localhost:5173` | Frontend application URL (used in email links) |

### Production Secret Enforcement
`env.ts` enforces `.superRefine()` runtime validation when `NODE_ENV === "production"`. Boot fails immediately (`process.exit(1)`) if default development secrets (`prod_access_secret_...`, `prod_refresh_secret_...`, `khademni_csrf_secret_...`, `recruitment_secure_pass_123`) are used in production environments.

---

## 2. Containerization & Orchestration

### Dockerfile Audit (`backend/Dockerfile`)
The backend uses a **Multi-Stage Docker Build** to minimize image size and attack surface:

1. **Stage 1 (`builder`)**: Uses `node:22-alpine`, installs dependencies (`npm ci`), copies Prisma schema, generates Prisma Client (`npm run db:generate`), and compiles TypeScript to JavaScript (`npm run build`).
2. **Stage 2 (`runner`)**: Uses minimal `node:22-alpine`, copies compiled `dist/`, generated Prisma Client, and production dependencies. Runs as non-root user `node` for security.

### Docker Compose Orchestration (`backend/docker-compose.yml`)
Orchestrates the complete local container stack:
- **`postgres` Service**: PostgreSQL 16 container with health check (`pg_isready`), persistent volume mount (`postgres_data`), bound to `127.0.0.1:5432`. Requires explicit `POSTGRES_PASSWORD` environment variable (no fallback secrets).
- **`backend` Service**: Backend Node.js container depending on `postgres` healthy condition, running automated migrations (`npx prisma migrate deploy`) before launching HTTP server. Environment variables (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) require explicit injection via `.env`.

---

## 3. Startup & Build Lifecycle

```
npm run dev        -> tsx watch src/index.ts (Development mode with hot reload)
npm run build      -> npm run db:generate && tsc (Builds Prisma Client & compiles JS to dist/)
npm run start      -> node dist/index.js (Production execution)
```
