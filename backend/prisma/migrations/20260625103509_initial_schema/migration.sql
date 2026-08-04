-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CANDIDATE', 'ADMIN');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "KeywordType" AS ENUM ('REQUIRED', 'OPTIONAL', 'BONUS');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('EXPERIENCE', 'DEGREE', 'CERTIFICATION', 'KEYWORD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'ACCEPTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CV', 'MOTIVATION_LETTER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'SCANNED', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScoreRecommendation" AS ENUM ('HIGHLY_RECOMMENDED', 'RECOMMENDED', 'AVERAGE', 'NOT_RECOMMENDED');

-- CreateEnum
CREATE TYPE "EvaluationMetricType" AS ENUM ('ACCURACY', 'PRECISION', 'RECALL', 'F1_SCORE', 'PRECISION_AT_1', 'PRECISION_AT_5', 'NDCG_AT_5', 'MAP', 'MRR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CANDIDATE',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerificationTokenHash" TEXT,
    "emailVerificationExpiresAt" TIMESTAMP(3),
    "passwordResetTokenHash" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "deadline" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_keywords" (
    "id" TEXT NOT NULL,
    "jobPostId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "type" "KeywordType" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_matching_rules" (
    "id" TEXT NOT NULL,
    "jobPostId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "type" "RuleType" NOT NULL,
    "condition" JSONB NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_matching_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobPostId" TEXT NOT NULL,
    "motivationLetter" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "trackingCode" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_documents" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedAt" TIMESTAMP(3),

    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv_parse_results" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "extractedText" TEXT NOT NULL,
    "parserName" TEXT NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "parsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cv_parse_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_matching_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hyperparameters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_matching_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_matching_model_evaluations" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "datasetName" TEXT NOT NULL,
    "evaluationSampleSize" INTEGER NOT NULL,
    "averageLatencyMs" DOUBLE PRECISION,
    "evaluationDetails" JSONB,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_matching_model_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_matching_metrics" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "type" "EvaluationMetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_matching_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching_runs" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "totalScore" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "matchedKeywords" JSONB,
    "missingKeywords" JSONB,
    "ruleResults" JSONB,
    "scoreBreakdown" JSONB,
    "semanticResult" JSONB,
    "technicalMetrics" JSONB,
    "explanation" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "matching_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_scores" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "matchingRunId" TEXT NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "recommendation" "ScoreRecommendation" NOT NULL,
    "explanation" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_status_histories" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "oldStatus" "ApplicationStatus",
    "newStatus" "ApplicationStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refreshTokenHash_key" ON "auth_sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "job_posts_status_idx" ON "job_posts"("status");

-- CreateIndex
CREATE INDEX "job_posts_createdById_idx" ON "job_posts"("createdById");

-- CreateIndex
CREATE INDEX "job_keywords_jobPostId_idx" ON "job_keywords"("jobPostId");

-- CreateIndex
CREATE UNIQUE INDEX "job_keywords_jobPostId_keyword_key" ON "job_keywords"("jobPostId", "keyword");

-- CreateIndex
CREATE INDEX "job_matching_rules_jobPostId_idx" ON "job_matching_rules"("jobPostId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_trackingCode_key" ON "applications"("trackingCode");

-- CreateIndex
CREATE INDEX "applications_jobPostId_idx" ON "applications"("jobPostId");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_candidateId_jobPostId_key" ON "applications"("candidateId", "jobPostId");

-- CreateIndex
CREATE UNIQUE INDEX "application_documents_applicationId_type_key" ON "application_documents"("applicationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "cv_parse_results_documentId_key" ON "cv_parse_results"("documentId");

-- CreateIndex
CREATE INDEX "ai_matching_model_evaluations_modelId_idx" ON "ai_matching_model_evaluations"("modelId");

-- CreateIndex
CREATE INDEX "ai_matching_metrics_evaluationId_idx" ON "ai_matching_metrics"("evaluationId");

-- CreateIndex
CREATE INDEX "ai_matching_metrics_type_idx" ON "ai_matching_metrics"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ai_matching_metrics_evaluationId_type_key" ON "ai_matching_metrics"("evaluationId", "type");

-- CreateIndex
CREATE INDEX "matching_runs_applicationId_idx" ON "matching_runs"("applicationId");

-- CreateIndex
CREATE INDEX "matching_runs_modelId_idx" ON "matching_runs"("modelId");

-- CreateIndex
CREATE INDEX "matching_runs_status_idx" ON "matching_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "application_scores_applicationId_key" ON "application_scores"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "application_scores_matchingRunId_key" ON "application_scores"("matchingRunId");

-- CreateIndex
CREATE INDEX "application_scores_finalScore_idx" ON "application_scores"("finalScore");

-- CreateIndex
CREATE INDEX "application_status_histories_applicationId_idx" ON "application_status_histories"("applicationId");

-- CreateIndex
CREATE INDEX "application_status_histories_changedById_idx" ON "application_status_histories"("changedById");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_posts" ADD CONSTRAINT "job_posts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_keywords" ADD CONSTRAINT "job_keywords_jobPostId_fkey" FOREIGN KEY ("jobPostId") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_matching_rules" ADD CONSTRAINT "job_matching_rules_jobPostId_fkey" FOREIGN KEY ("jobPostId") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobPostId_fkey" FOREIGN KEY ("jobPostId") REFERENCES "job_posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_parse_results" ADD CONSTRAINT "cv_parse_results_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "application_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_matching_model_evaluations" ADD CONSTRAINT "ai_matching_model_evaluations_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ai_matching_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_matching_metrics" ADD CONSTRAINT "ai_matching_metrics_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "ai_matching_model_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matching_runs" ADD CONSTRAINT "matching_runs_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matching_runs" ADD CONSTRAINT "matching_runs_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ai_matching_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_scores" ADD CONSTRAINT "application_scores_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_scores" ADD CONSTRAINT "application_scores_matchingRunId_fkey" FOREIGN KEY ("matchingRunId") REFERENCES "matching_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_histories" ADD CONSTRAINT "application_status_histories_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_histories" ADD CONSTRAINT "application_status_histories_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
