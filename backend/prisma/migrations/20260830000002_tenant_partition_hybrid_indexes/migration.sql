-- Security Fix Migration: Add organization_id and job_post_id tenant partition columns
-- to candidate_hybrid_indexes to prevent cross-tenant vector data leakage.

-- 1. Add the new columns (nullable initially to allow the backfill below)
ALTER TABLE "candidate_hybrid_indexes"
ADD COLUMN IF NOT EXISTS "organization_id" TEXT,
ADD COLUMN IF NOT EXISTS "job_post_id"     TEXT;

-- 2. Backfill existing rows with the correct organization and job post from their application
UPDATE "candidate_hybrid_indexes" chi
SET
  "organization_id" = jp."organizationId",
  "job_post_id"     = a."jobPostId"
FROM "applications" a
JOIN "job_posts" jp ON jp.id = a."jobPostId"
WHERE chi.application_id = a.id;

-- 3. Delete any rows that could not be backfilled (orphaned records)
DELETE FROM "candidate_hybrid_indexes"
WHERE "organization_id" IS NULL OR "job_post_id" IS NULL;

-- 4. Enforce NOT NULL now that backfill is complete
ALTER TABLE "candidate_hybrid_indexes"
ALTER COLUMN "organization_id" SET NOT NULL,
ALTER COLUMN "job_post_id"     SET NOT NULL;

-- 5. Add foreign key constraints
ALTER TABLE "candidate_hybrid_indexes"
ADD CONSTRAINT "candidate_hybrid_indexes_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "candidate_hybrid_indexes"
ADD CONSTRAINT "candidate_hybrid_indexes_job_post_id_fkey"
  FOREIGN KEY ("job_post_id") REFERENCES "job_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Add composite index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS "candidate_hybrid_indexes_org_job_idx"
  ON "candidate_hybrid_indexes"("organization_id", "job_post_id");
