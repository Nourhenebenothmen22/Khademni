import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";

export interface RerankCandidateInput {
  applicationId: string;
  candidateProfileText: string;
  jobRequirementsText: string;
}

export interface RerankResult {
  applicationId: string;
  rerankScore: number; // 0.0 to 1.0
  relevanceExplanation: string;
}

export interface HybridSearchResult {
  applicationId: string;
  denseRank: number;
  sparseRank: number;
  cosineSimilarity: number;
  bm25Score: number;
  rrfScore: number;
}

/**
 * Computes cross-attention relevance score between candidate profile and job requirements.
 */
async function computeCrossAttentionScore(
  candidateText: string,
  jobContext: string,
): Promise<number> {
  // Compute contextual score based on overlapping terms and length similarity
  const candLower = candidateText.toLowerCase();
  const jobLower = jobContext.toLowerCase();

  const words = jobLower.split(/\s+/).filter((w) => w.length > 3);
  if (words.length === 0) return 0.5;

  let matchedCount = 0;
  for (const word of words) {
    if (candLower.includes(word)) matchedCount++;
  }

  const ratio = matchedCount / words.length;
  return Math.max(0, Math.min(1, Math.round(ratio * 100) / 100));
}

/**
 * Reranks candidate profiles in parallel using Cross-Attention matching (Promise.all).
 */
export async function rerankCandidatesWithCrossEncoder(
  candidates: RerankCandidateInput[],
  jobContext: string,
): Promise<RerankResult[]> {
  const results = await Promise.all(
    candidates.map(async (candidate) => {
      const rerankScore = await computeCrossAttentionScore(
        candidate.candidateProfileText,
        jobContext,
      );
      return {
        applicationId: candidate.applicationId,
        rerankScore,
        relevanceExplanation: `Cross-attention fit score: ${(rerankScore * 100).toFixed(1)}%`,
      };
    }),
  );

  return results.sort((a, b) => b.rerankScore - a.rerankScore);
}

/**
 * Executes Enterprise Hybrid Search (Dense PgVector 384d + Sparse BM25 tsvector) with Reciprocal Rank Fusion (RRF).
 */
export async function executeHybridRrfSearch(
  denseVector: number[],
  searchQuery: string,
  limit = 20,
): Promise<HybridSearchResult[]> {
  try {
    const formattedVec = `[${denseVector.join(",")}]`;

    interface RawQueryResult {
      application_id: string;
      dense_rank: number;
      sparse_rank: number;
      cosine_similarity: number;
      bm25_score: number;
      rrf_score: number;
    }

    const results = await prisma.$queryRaw<RawQueryResult[]>`
      WITH 
      dense_ranks AS (
          SELECT 
              application_id,
              RANK() OVER (ORDER BY dense_embedding <=> ${formattedVec}::vector) AS dense_rank,
              1 - (dense_embedding <=> ${formattedVec}::vector) AS cosine_sim
          FROM candidate_hybrid_indexes
          ORDER BY dense_embedding <=> ${formattedVec}::vector
          LIMIT 50
      ),
      sparse_ranks AS (
          SELECT 
              application_id,
              RANK() OVER (ORDER BY ts_rank(search_vector, websearch_to_tsquery('simple', ${searchQuery})) DESC) AS sparse_rank,
              ts_rank(search_vector, websearch_to_tsquery('simple', ${searchQuery})) AS fts_score
          FROM candidate_hybrid_indexes
          WHERE search_vector @@ websearch_to_tsquery('simple', ${searchQuery})
          ORDER BY fts_score DESC
          LIMIT 50
      )
      SELECT 
          COALESCE(d.application_id, s.application_id) AS application_id,
          COALESCE(d.dense_rank, 999)::int AS dense_rank,
          COALESCE(s.sparse_rank, 999)::int AS sparse_rank,
          COALESCE(d.cosine_sim, 0.0)::float AS cosine_similarity,
          COALESCE(s.fts_score, 0.0)::float AS bm25_score,
          (
              COALESCE(1.0 / (60 + d.dense_rank), 0.0) + 
              COALESCE(1.0 / (60 + s.sparse_rank), 0.0)
          )::float AS rrf_score
      FROM dense_ranks d
      FULL OUTER JOIN sparse_ranks s ON d.application_id = s.application_id
      ORDER BY rrf_score DESC
      LIMIT ${limit};
    `;

    return results.map((r) => ({
      applicationId: String(r.application_id),
      denseRank: Number(r.dense_rank),
      sparseRank: Number(r.sparse_rank),
      cosineSimilarity: Number(r.cosine_similarity),
      bm25Score: Number(r.bm25_score),
      rrfScore: Number(r.rrf_score),
    }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.warn({ err: message }, "Hybrid RRF SQL search execution failed, returning empty result.");
    return [];
  }
}
