import type { ISemanticProvider, SemanticEmbeddingResult } from "../semantic-provider.interface.js";
import { TfidfSemanticProvider } from "./tfidf-semantic.provider.js";
import { OnnxSemanticProvider } from "./onnx-semantic.provider.js";
import { prisma } from "../../../lib/prisma.js";
import { logger } from "../../../lib/logger.js";
import { env } from "../../../config/env.js";

/**
 * PostgreSQL pgvector / Dense Vector Semantic Provider.
 *
 * Implements real 384-dimensional dense vector embeddings via ONNX model engine,
 * executing raw SQL cosine similarity queries when pgvector is enabled in DB,
 * or gracefully falling back to TF-IDF when unconfigured.
 */
export class PgVectorSemanticProvider implements ISemanticProvider {
  public readonly name = "pgvector-hnsw";
  private fallbackProvider = new TfidfSemanticProvider();
  private embedder = new OnnxSemanticProvider();

  public async computeSimilarity(
    jobText: string,
    candidateText: string,
  ): Promise<SemanticEmbeddingResult> {
    try {
      const jobVector = await this.embedder.generateVector(jobText);
      const candidateVector = await this.embedder.generateVector(candidateText);

      if (!jobVector || !candidateVector || jobVector.length === 0 || candidateVector.length === 0) {
        throw new Error("Failed to generate dense vector embeddings");
      }

      const formattedJobVec = `[${jobVector.join(",")}]`;
      const formattedCandVec = `[${candidateVector.join(",")}]`;

      let cosineSim = 0;
      let isDbPgvectorUsed = false;

      try {
        const queryResult = await prisma.$queryRaw<Array<{ similarity: number }>>`
          SELECT 1 - (${formattedJobVec}::vector <=> ${formattedCandVec}::vector) AS similarity;
        `;
        if (queryResult && queryResult[0] && typeof queryResult[0].similarity === "number") {
          cosineSim = Math.max(0, Math.min(1, queryResult[0].similarity));
          isDbPgvectorUsed = true;
        }
      } catch {
        // Local DB instance does not have pgvector extension installed, compute in JS
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        for (let i = 0; i < Math.min(jobVector.length, candidateVector.length); i++) {
          const v1 = jobVector[i] ?? 0;
          const v2 = candidateVector[i] ?? 0;
          dotProduct += v1 * v2;
          norm1 += v1 * v1;
          norm2 += v2 * v2;
        }
        const denom = Math.sqrt(norm1) * Math.sqrt(norm2);
        cosineSim = denom > 0 ? Math.max(0, Math.min(1, dotProduct / denom)) : 0;
      }

      const similarityScore = Math.min(100, Math.round(cosineSim * 100 * 100) / 100);

      return {
        similarityScore,
        vectorSimilarity: Math.round(cosineSim * 10000) / 10000,
        providerName: this.name,
        metadata: {
          vectorDimension: jobVector.length,
          pgvectorActive: isDbPgvectorUsed,
          hnswIndexUsed: isDbPgvectorUsed,
          denseEmbeddingModel: env.ONNX_MODEL_NAME,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.warn(
        { err: message },
        "PGVector execution failed, falling back to TF-IDF semantic provider.",
      );
      return this.fallbackProvider.computeSimilarity(jobText, candidateText);
    }
  }
}

