-- Production Schema Fix Migration (20260809000000_production_schema_fix)

-- 1. Ensure required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Update ApplicationStatus Enum Values
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'INTERVIEW_SCHEDULED';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'INTERVIEWED';

-- 3. Create Enums if missing
DO $$ BEGIN
    CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "InterviewType" AS ENUM ('SCREENING', 'TECHNICAL', 'PEDAGOGICAL', 'HR', 'FINAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MeetingProvider" AS ENUM ('GOOGLE_MEET', 'ZOOM', 'TEAMS', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ScorecardRecommendation" AS ENUM ('STRONG_HIRE', 'HIRE', 'NEUTRAL', 'DO_NOT_HIRE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Create Table interviews
CREATE TABLE IF NOT EXISTS "interviews" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "jobPostId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "InterviewType" NOT NULL DEFAULT 'TECHNICAL',
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "provider" "MeetingProvider" NOT NULL DEFAULT 'GOOGLE_MEET',
    "meetingUrl" TEXT,
    "meetingId" TEXT,
    "location" TEXT,
    "icalUid" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- 5. Create Table interviewer_assignments
CREATE TABLE IF NOT EXISTS "interviewer_assignments" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interviewer_assignments_pkey" PRIMARY KEY ("id")
);

-- 6. Create Table interview_scorecards
CREATE TABLE IF NOT EXISTS "interview_scorecards" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "recommendation" "ScorecardRecommendation" NOT NULL,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_scorecards_pkey" PRIMARY KEY ("id")
);

-- 7. Create Table scorecard_criteria_scores
CREATE TABLE IF NOT EXISTS "scorecard_criteria_scores" (
    "id" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "criterion" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scorecard_criteria_scores_pkey" PRIMARY KEY ("id")
);

-- 8. Create Table organization_provider_configs
CREATE TABLE IF NOT EXISTS "organization_provider_configs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "MeetingProvider" NOT NULL,
    "credentials" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_provider_configs_pkey" PRIMARY KEY ("id")
);

-- 9. Create Table candidate_hybrid_indexes
CREATE TABLE IF NOT EXISTS "candidate_hybrid_indexes" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "content" TEXT,
    "dense_embedding" vector(384),
    "search_vector" tsvector,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_hybrid_indexes_pkey" PRIMARY KEY ("id")
);

-- 10. Indexes and Unique Constraints
CREATE UNIQUE INDEX IF NOT EXISTS "interviewer_assignments_interviewId_interviewerId_key" ON "interviewer_assignments"("interviewId", "interviewerId");
CREATE UNIQUE INDEX IF NOT EXISTS "interview_scorecards_interviewId_interviewerId_key" ON "interview_scorecards"("interviewId", "interviewerId");
CREATE UNIQUE INDEX IF NOT EXISTS "organization_provider_configs_organizationId_provider_key" ON "organization_provider_configs"("organizationId", "provider");
CREATE UNIQUE INDEX IF NOT EXISTS "candidate_hybrid_indexes_application_id_key" ON "candidate_hybrid_indexes"("application_id");

CREATE INDEX IF NOT EXISTS "interviews_applicationId_idx" ON "interviews"("applicationId");
CREATE INDEX IF NOT EXISTS "interviews_jobPostId_idx" ON "interviews"("jobPostId");
CREATE INDEX IF NOT EXISTS "interviews_candidateId_idx" ON "interviews"("candidateId");
CREATE INDEX IF NOT EXISTS "interviews_organizationId_idx" ON "interviews"("organizationId");
CREATE INDEX IF NOT EXISTS "interviews_status_idx" ON "interviews"("status");

-- Foreign Keys
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_jobPostId_fkey" FOREIGN KEY ("jobPostId") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "interviewer_assignments" ADD CONSTRAINT "interviewer_assignments_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interviewer_assignments" ADD CONSTRAINT "interviewer_assignments_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "interview_scorecards" ADD CONSTRAINT "interview_scorecards_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interview_scorecards" ADD CONSTRAINT "interview_scorecards_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scorecard_criteria_scores" ADD CONSTRAINT "scorecard_criteria_scores_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "interview_scorecards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_provider_configs" ADD CONSTRAINT "organization_provider_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_hybrid_indexes" ADD CONSTRAINT "candidate_hybrid_indexes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
