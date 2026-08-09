# Khademni Teacher Recruitment Platform

An Enterprise SaaS Platform for Teacher Recruitment powered by Explainable AI Matching (384d Dense PGVector Embeddings + Full-Text Search), Multi-Tenant Organization Isolation, and Next.js 16 App Router Frontend.

---

## 1. Root Docker Compose Architecture

The platform is orchestrated using a unified **Docker Compose architecture** located at the repository root (`docker-compose.yml`).

```text
intelligent-teacher-recruitment-platform/
├── docker-compose.yml               # Root Orchestration Descriptor
├── backend/
│   ├── Dockerfile                   # Multi-Stage Node.js 22 Express Runner
│   ├── src/                         # REST APIs, Services, PGVector Engine
│   └── prisma/                      # Database Schema & Migrations
├── frontend/
│   ├── Dockerfile                   # Multi-Stage Next.js 16 Standalone Runner
│   └── src/                         # Next.js App Router, TanStack Query, UI
└── README.md
```

---

## 2. Service Summary & Network Topology

All containers communicate over an isolated bridge network (`recruitment_net`).

| Service Name | Container Name | Base Image / Context | Internal Port | External Published Port | Healthcheck Endpoint / CMD |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **`postgres`** | `recruitment_postgres` | `postgres:16-alpine` | `5432` | `127.0.0.1:5432` | `pg_isready -U recruitment_user -d recruitment_db` |
| **`redis`** | `recruitment_redis` | `redis:7-alpine` | `6379` | `127.0.0.1:6379` | `redis-cli ping` |
| **`backend`** | `recruitment_backend` | `./backend/Dockerfile` | `3000` | `3000` | `curl -f http://localhost:3000/health` |
| **`frontend`** | `recruitment_frontend` | `./frontend/Dockerfile` | `3001` | `5173` | `wget --spider http://localhost:3001/jobs` |

---

## 3. Detailed Compose Services

### A. `postgres` (Database Layer)
- **Role**: Primary relational database with `pgvector` vector similarity support.
- **Volume**: `postgres_data` mapped to `/var/lib/postgresql/data`.
- **Health Guarantee**: Enforces `pg_isready` before dependent services initialize.

### B. `redis` (Cache & Queue State Layer)
- **Role**: Redis 7 key-value store for distributed rate-limiting counters and background matching queue state.
- **Volume**: `redis_data` mapped to `/data`.
- **Health Guarantee**: Enforces `redis-cli ping` before dependent backend initialization.

### C. `backend` (Core API & AI Matching Engine)
- **Role**: Express REST API, Argon2 authentication, MFA TOTP, Zod validators, Super Admin RBAC, pgvector 384d AI matching engine, and interview scheduling services.
- **Depends On**: `postgres` (condition: `service_healthy`), `redis` (condition: `service_healthy`).
- **Volume**: `uploads_data` mapped to `/app/uploads` for CV PDF/DOCX storage.
- **Healthcheck**: Queries `http://localhost:3000/health` every 15s.

### D. `frontend` (Next.js 16 Client & Admin Dashboard)
- **Role**: Next.js 16 App Router UI, candidate portal, interview manager, and admin ATS dashboard.
- **Depends On**: `backend` (condition: `service_healthy`).
- **Build Output**: Optimized `standalone` mode outputting minimal production Node.js runner images.
- **Healthcheck**: Queries `http://localhost:3001/jobs` every 15s.

---

## 4. Networks & Persistent Volumes

### Networks
- **`recruitment_net`**: Dedicated `bridge` network enabling inter-container service resolution (e.g. `http://backend:3000` internally).

### Volumes
- **`postgres_data`**: Persists PostgreSQL 23 models, indexes, and pgvector embeddings across container restarts.
- **`redis_data`**: Persists Redis rate limiting counters and BullMQ matching queue states.
- **`uploads_data`**: Persists candidate CV documents uploaded via `multipart/form-data`.

---

## 5. Environment Variables & Centralization

Environment configuration is read centrally from `./backend/.env`:

```env
# Application & Server Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://localhost:3001

# Database Connection (PostgreSQL + PGVector)
DATABASE_URL=postgres://recruitment_user:recruitment_secure_pass_123@postgres:5432/recruitment_db

# Security & Tokens (Minimum 32 characters)
JWT_ACCESS_SECRET=prod_access_secret_key_minimum_32_characters_long_987
JWT_REFRESH_SECRET=prod_refresh_secret_key_minimum_32_characters_long_987
CSRF_SECRET=khademni_csrf_secret_token_key_32chars

# Brevo SMTP Configuration
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=99c774001@smtp-brevo.com
SMTP_PASS=xsmtpsib-REPLACE_WITH_YOUR_BREVO_SMTP_KEY
SMTP_FROM="Khademni Recruitment <noreply@khademni.com>"

# Frontend Client Public API URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

---

## 6. Startup Commands & Operational Guide

### Start Entire Platform in Docker Compose
```bash
# Build images and start all containers in background
docker compose up --build -d

# Verify container status and health
docker compose ps

# View real-time logs across all services
docker compose logs -f
```

### Stop Platform Services
```bash
# Stop containers without removing volume data
docker compose down

# Stop containers and wipe volumes (destructive)
docker compose down -v
```

---

## 7. Frontend ↔ Backend Inter-Service Communication

1. **Client Browser Requests**:
   - Web browser accesses frontend at `http://localhost:5173`.
   - Browser sends REST calls directly to `http://localhost:3000/api/v1` via CORS.
2. **Double-Submit CSRF Protection**:
   - Client fetches CSRF token from `http://localhost:3000/api/v1/auth/csrf`.
   - Client includes `X-CSRF-Token` header on mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`).
3. **Internal Container Networking**:
   - Containers resolve each other by service name (`postgres`, `redis`, `backend`, `frontend`) on `recruitment_net`.

---

## 8. Production Deployment Requirements

- **SSL Termination / Reverse Proxy**: Place Nginx or Cloudflare in front of ports `5173` (Frontend) and `3000` (Backend) with valid TLS certificates.
- **Database Migrations**: Run `npx prisma migrate deploy` inside `recruitment_backend` before starting public traffic.
- **PGVector SQL Extension**: Execute `CREATE EXTENSION IF NOT EXISTS vector;` and `CREATE EXTENSION IF NOT EXISTS pg_trgm;` on PostgreSQL.
