# Intelligent Teacher Recruitment Platform — Developer Command Guide

Comprehensive backend & DevOps reference manual containing all verified commands, operational workflows, and maintenance checklists for the backend application.

---

## 1. Initial Setup (First Time)

### 1.1 Copy Environment File
- **Command**: `cp .env.example .env` (Linux/macOS) or `copy .env.example .env` (Windows PowerShell)
- **Purpose**: Creates your local `.env` configuration file from the template repository.
- **When to run it**: Immediately after cloning the repository for the first time.
- **Expected result**: `.env` file is created in `apps/backend/` containing default configuration keys.

### 1.2 Install Node Dependencies
- **Command**: `npm install`
- **Purpose**: Installs all required runtime and development dependencies declared in `package.json`.
- **When to run it**: First time setting up the project or whenever `package.json` / `package-lock.json` is updated.
- **Expected result**: `node_modules/` folder created with all required packages.

### 1.3 Start Postgres Database Container
- **Command**: `docker compose up -d postgres` or `npm run docker:up`
- **Purpose**: Starts the PostgreSQL database service in detached background mode.
- **When to run it**: First-time setup before running Prisma database commands.
- **Expected result**: Postgres container `recruitment_postgres` starts on port `5432` and passes health checks.

### 1.4 Apply Prisma Database Migrations
- **Command**: `npm run db:migrate:dev`
- **Purpose**: Runs pending Prisma migrations against the target database and generates Prisma Client types.
- **When to run it**: Initial setup or after pulling schema updates from git.
- **Expected result**: Database schema applied, tables created, Prisma Client generated into `src/generated/prisma`.

### 1.5 Seed Initial Database Data
- **Command**: `npm run db:seed`
- **Purpose**: Executes `prisma/seed.ts` via `tsx` to populate default roles, users, or test entries.
- **When to run it**: Initial setup after database schema creation.
- **Expected result**: Console outputs successful seeding message and initial record count.

---

## 2. Install Dependencies

### 2.1 Standard Dependency Installation
- **Command**: `npm install`
- **Purpose**: Resolves and installs packages according to `package-lock.json`.
- **When to run it**: Regular local development setup.
- **Expected result**: Packages installed in `node_modules`.

### 2.2 Strict Clean Dependency Installation (CI / Production)
- **Command**: `npm ci` (or `npm ci --omit=dev` for production runtime)
- **Purpose**: Performs a clean, reproducible installation matching `package-lock.json` exactly without altering the lockfile.
- **When to run it**: Automated CI/CD pipelines, Docker builds, or production container image creation.
- **Expected result**: Clean `node_modules` generated with exact locked versions.

---

## 3. Environment Configuration

### 3.1 Verify Database Connectivity
- **Command**: `npm run db:verify`
- **Purpose**: Executes `scripts/verify-prisma.ts` to verify database connection via Prisma.
- **When to run it**: After updating `.env` database parameters or starting Postgres container.
- **Expected result**: Output `✅ Connected. Found X users in the database.` or connection error traceback.

---

## 4. Start Docker Services

### 4.1 Launch All Services in Background
- **Command**: `npm run docker:up` or `docker compose up -d`
- **Purpose**: Launches Postgres database and backend application containers in background.
- **When to run it**: When running the full stack locally using Docker.
- **Expected result**: Both `recruitment_postgres` and `recruitment_backend` containers start and achieve healthy status.

### 4.2 Launch Database Only (Local Node Dev Mode)
- **Command**: `docker compose up -d postgres`
- **Purpose**: Starts only the Postgres database container while you run `npm run dev` directly on host machine.
- **When to run it**: Daily local active feature development.
- **Expected result**: Postgres running on port `5432`, leaving port `3000` open for host node process.

---

## 5. Database Commands (Prisma)

### 5.1 Generate Prisma Client
- **Command**: `npm run db:generate`
- **Purpose**: Generates TypeScript types and Prisma Client files into `src/generated/prisma`.
- **When to run it**: After modifying `prisma/schema.prisma` or running `npm install`.
- **Expected result**: `✔ Generated Prisma Client (7.8.0) to .\src\generated\prisma`.

### 5.2 Create and Apply Development Migration
- **Command**: `npm run db:migrate` or `npm run db:migrate:dev`
- **Purpose**: Generates a new SQL migration file in `prisma/migrations/` and applies it to dev database.
- **When to run it**: When changing models/fields in `prisma/schema.prisma`.
- **Expected result**: Migration file generated, applied to database, client re-generated.

### 5.3 Apply Production Migrations
- **Command**: `npm run db:migrate:deploy`
- **Purpose**: Applies all un-applied existing migrations to production/staging database without prompting or creating new migrations.
- **When to run it**: Production deployment pipeline step.
- **Expected result**: Database schema updated to latest migration state.

### 5.4 Push Schema Without Migration Files
- **Command**: `npm run db:push`
- **Purpose**: Directly updates target database schema to match `schema.prisma` without creating a migration file.
- **When to run it**: Rapid prototyping or testing schema changes locally.
- **Expected result**: Database schema synchronized instantly.

### 5.5 Seed Database
- **Command**: `npm run db:seed`
- **Purpose**: Runs seed script defined in `prisma.config.ts` (`tsx prisma/seed.ts`).
- **When to run it**: Populating fresh database with test records.
- **Expected result**: Seed script executes successfully.

### 5.6 Open Prisma GUI Studio
- **Command**: `npm run db:studio`
- **Purpose**: Launches Prisma Studio web interface for browsing and editing database records visually.
- **When to run it**: When viewing or editing database data during debugging.
- **Expected result**: Browser interface opens at `http://localhost:5555`.

### 5.7 Hard Reset Database (Development Only)
- **Command**: `npx prisma migrate reset`
- **Purpose**: Drops database schema, re-applies all migrations from scratch, and runs seed script.
- **When to run it**: When development database is corrupt or out of sync.
- **Expected result**: Database wiped, migrations re-applied, fresh seed data populated.

---

## 6. Run Backend

### 6.1 Development Mode (Hot Reloading)
- **Command**: `npm run dev`
- **Purpose**: Runs `tsx watch src/index.ts` to automatically recompile and restart server on file changes.
- **When to run it**: Active backend code development.
- **Expected result**: Server starts listening at `http://localhost:3000` with hot-reloading active.

### 6.2 Production Mode (Built Dist)
- **Command**: `npm run start`
- **Purpose**: Runs compiled JavaScript bundle at `dist/index.js` using Node.js.
- **When to run it**: Testing built application locally or in production runner containers.
- **Expected result**: Express production server listening on target `PORT`.

---

## 7. Run Swagger / OpenAPI

### 7.1 View Interactive Swagger UI (Runtime)
- **Action**: Open browser to `http://localhost:3000/docs` while server is running.
- **Purpose**: Interactive API documentation and endpoint testing UI.
- **When to use**: Endpoint exploration and testing JWT authorization flow.
- **Expected result**: Rendered Swagger UI listing all API endpoints, schemas, and security definitions.

### 7.2 Fetch OpenAPI JSON (Runtime)
- **Action**: Request `http://localhost:3000/docs.json` while server is running.
- **Purpose**: Provides raw OpenAPI 3.0.0 JSON specification.
- **When to use**: Consuming spec by API gateways, Postman, or frontend SDK generators.
- **Expected result**: OpenAPI JSON payload returned with `Content-Type: application/json`.

### 7.3 Generate Static OpenAPI Spec File (CLI)
- **Command**: `npm run openapi:generate` (or alias `npm run swagger:generate`)
- **Purpose**: Runs `scripts/generate-openapi.ts` to output `openapi.json` to project root without running HTTP server.
- **When to run it**: CI/CD build step, documentation export, or spec linting.
- **Expected result**: `openapi.json` created/updated at project root.

---

## 8. Run Tests

### 8.1 Execute Integration Test Suite
- **Command**: `npm run test` or `npm run test:integration`
- **Purpose**: Runs `scripts/integration-test.ts` via `tsx` testing authentication, MFA login flow, refresh token rotation, breach lockout defense, job state machine, and application uploads.
- **When to run it**: Before committing code or opening pull requests.
- **Expected result**: `🎉 ALL REFACTORED SECURITY & FUNCTIONAL INTEGRATION TESTS PASSED!`.

---

## 9. Lint, Format, and Type Checking

### 9.1 Type Check (TypeScript)
- **Command**: `npm run typecheck`
- **Purpose**: Executes `tsc --noEmit` to validate all TypeScript types across `src/` without writing files.
- **When to run it**: Continuously during coding, pre-commit, or CI pipeline.
- **Expected result**: Process completes with 0 errors.

### 9.2 ESLint Audit
- **Command**: `npm run lint`
- **Purpose**: Audits TypeScript files for linting errors and code style rules.
- **When to run it**: Code review, pre-commit, or CI pipeline.
- **Expected result**: No lint errors reported.

### 9.3 ESLint Auto-Fix
- **Command**: `npm run lint:fix`
- **Purpose**: Automatically fixes auto-fixable ESLint issues in `src/`.
- **When to run it**: When `npm run lint` flags fixable warnings/errors.
- **Expected result**: Code updated to pass ESLint rules.

### 9.4 Prettier Format Check
- **Command**: `npm run format:check`
- **Purpose**: Validates whether all source files match Prettier code style.
- **When to run it**: CI check step before merging PRs.
- **Expected result**: `All matched files use Prettier code style!`.

### 9.5 Prettier Format Auto-Fix
- **Command**: `npm run format`
- **Purpose**: Automatically formats all TypeScript files in `src/` according to Prettier config.
- **When to run it**: Before committing code.
- **Expected result**: All modified files formatted cleanly.

---

## 10. Build Project

### 10.1 Clean Build Directory
- **Command**: `npm run clean`
- **Purpose**: Removes `dist/` build directory.
- **When to run it**: Cleaning build artifacts manually.
- **Expected result**: `dist/` folder deleted.

### 10.2 Production TypeScript Build
- **Command**: `npm run build`
- **Purpose**: Automatically runs `npm run prebuild` (clean), `npm run db:generate` (Prisma client), and `tsc` (compiles `src/` into `dist/`).
- **When to run it**: Preparing production deployment or verifying build integrity.
- **Expected result**: `dist/` populated with compiled JS files and declaration maps.

---

## 11. Docker Management

### 11.1 Start Containers in Background
- **Command**: `npm run docker:up` or `docker compose up -d`
- **Purpose**: Starts all compose services in background.
- **When to run it**: Running application stack.
- **Expected result**: Containers created and running.

### 11.2 Stop Containers
- **Command**: `npm run docker:down` or `docker compose down`
- **Purpose**: Stops and removes container stack, maintaining named volumes.
- **When to run it**: Stopping work or freeing ports.
- **Expected result**: Containers stopped and removed.

### 11.3 Stop Containers and Purge Volumes
- **Command**: `npm run docker:down:v` or `docker compose down -v`
- **Purpose**: Stops stack and deletes persistent data volume `postgres_data`.
- **When to run it**: Complete database reset for Docker stack.
- **Expected result**: Postgres data volume removed.

### 11.4 Rebuild Docker Containers
- **Command**: `npm run docker:build` or `docker compose build --no-cache`
- **Purpose**: Rebuilds Docker image without cached layers.
- **When to run it**: After updating `Dockerfile` or `package.json`.
- **Expected result**: Fresh Docker image built.

### 11.5 View Container Logs
- **Command**: `npm run docker:logs` or `docker compose logs -f`
- **Purpose**: Tails live logs from all running Docker services.
- **When to run it**: Debugging container runtime issues.
- **Expected result**: Real-time console log stream output.

### 11.6 Restart Containers
- **Command**: `npm run docker:restart` or `docker compose restart`
- **Purpose**: Restarts running container services.
- **When to run it**: Applying configuration updates.
- **Expected result**: Containers restarted cleanly.

---

## 12. Useful Git Commands

### 12.1 Check Repository Status
- **Command**: `git status`
- **Purpose**: Shows modified, staged, and untracked files.
- **When to run it**: Before staging or committing.

### 12.2 Inspect Code Changes
- **Command**: `git diff`
- **Purpose**: Shows exact line changes in modified files.
- **When to run it**: Self-reviewing code before staging.

### 12.3 Stage and Commit Changes
- **Command**: `git add .` && `git commit -m "feat(module): description"`
- **Purpose**: Stages and commits code with descriptive message.
- **When to run it**: Completing a logical unit of work.

---

## 13. Troubleshooting Commands

### 13.1 Check Which Process is Using Port 3000 or 5432
- **PowerShell**: `netstat -ano | findstr :3000` / `netstat -ano | findstr :5432`
- **Linux/macOS**: `lsof -i :3000` / `lsof -i :5432`
- **Purpose**: Identifies PID blocking required ports.
- **When to run it**: When seeing `EADDRINUSE: address already in use`.

### 13.2 Force Clean Re-install of Dependencies
- **Command**: `rm -rf node_modules package-lock.json && npm install` (Linux/macOS) or `Remove-Item -Recurse -Force node_modules, package-lock.json; npm install` (PowerShell)
- **Purpose**: Completely re-installs all packages when encountering corrupt node_modules.

---

# Checklists & Workflows

## 📋 First-Time Project Setup Checklist

1. [ ] **Clone Repository**
2. [ ] **Create Environment File**: `copy .env.example .env`
3. [ ] **Install Dependencies**: `npm install`
4. [ ] **Start Postgres Database**: `docker compose up -d postgres`
5. [ ] **Verify Database Connection**: `npm run db:verify`
6. [ ] **Apply Migrations**: `npm run db:migrate:dev`
7. [ ] **Seed Database**: `npm run db:seed`
8. [ ] **Generate OpenAPI Spec**: `npm run openapi:generate`
9. [ ] **Start Dev Server**: `npm run dev`
10. [ ] **Verify Documentation**: Open `http://localhost:3000/docs` in browser

---

## ☀️ Daily Startup Workflow (Commands to run every time project is opened)

1. **Open Terminal in `apps/backend`**
2. **Ensure Database Container is Running**:
   ```bash
   docker compose up -d postgres
   ```
3. **Start Development Server with Hot-Reloading**:
   ```bash
   npm run dev
   ```
4. *(Optional)* **Open Prisma Studio in separate tab if inspecting DB**:
   ```bash
   npm run db:studio
   ```

---

## 🚀 Before Pushing to Git Checklist

Run this 4-step command pipeline before pushing code or creating a Pull Request:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test
```

- [ ] **Type Check Passed**: `npm run typecheck` (0 errors)
- [ ] **Lint Passed**: `npm run lint` (0 errors)
- [ ] **Format Checked**: `npm run format:check` (or run `npm run format` if needed)
- [ ] **Integration Tests Passed**: `npm run test` (All tests green)
- [ ] **OpenAPI Spec Fresh**: `npm run openapi:generate`

---

## 🏭 Production Deployment Workflow

1. **Set Production Environment Variables**: Ensure `NODE_ENV=production`, secure `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and production `DATABASE_URL` are configured.
2. **Run Production Database Migrations**:
   ```bash
   npm run db:migrate:deploy
   ```
3. **Build Container Image**:
   ```bash
   docker build -t recruitment-backend:latest .
   ```
4. **Deploy / Launch Production Stack**:
   ```bash
   docker compose up -d
   ```
5. **Verify Production Container Health**:
   ```bash
   docker compose ps
   curl -f http://localhost:3000/health
   ```
