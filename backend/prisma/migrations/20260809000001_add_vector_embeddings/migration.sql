-- Production Vector Embedding Persistence Migration (20260809000001_add_vector_embeddings)

-- 1. Ensure vector extension is enabled
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Add 384-dimensional vector embedding column to document_parse_results
ALTER TABLE "document_parse_results" 
ADD COLUMN IF NOT EXISTS "embedding" vector(384);

-- 3. Add 384-dimensional vector embedding column to job_posts
ALTER TABLE "job_posts" 
ADD COLUMN IF NOT EXISTS "embedding" vector(384);
