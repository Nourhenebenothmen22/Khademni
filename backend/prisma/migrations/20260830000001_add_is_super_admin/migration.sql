-- Security Fix Migration: Add is_super_admin column to users table
-- Replaces the insecure X-Super-Admin HTTP header bypass with a database-backed field.

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "is_super_admin" BOOLEAN NOT NULL DEFAULT false;
