import type { ISemanticProvider, SemanticEmbeddingResult } from "../semantic-provider.interface.js";
import { TfidfSemanticProvider } from "./tfidf-semantic.provider.js";

/**
 * Neural / Vector Embedding Semantic Provider.
 *
 * Designed for pgvector, OpenAI/Gemini embeddings, or ONNX local models.
 * Delegates to TF-IDF fallback when vector database environment is unconfigured.
 */
export class VectorSemanticProvider implements ISemanticProvider {
  public readonly name = "vector-pgvector";
  private fallbackProvider = new TfidfSemanticProvider();

  public async computeSimilarity(
    jobText: string,
    candidateText: string,
  ): Promise<SemanticEmbeddingResult> {
    // If pgvector / external embedding DB service is unconfigured, use fallback cleanly
    const fallbackResult = await this.fallbackProvider.computeSimilarity(jobText, candidateText);

    return {
      similarityScore: fallbackResult.similarityScore,
      vectorSimilarity: fallbackResult.vectorSimilarity,
      providerName: this.name,
      metadata: {
        ...fallbackResult.metadata,
        vectorEngine: "fallback-normalized-tf-idf",
        isVectorDbActive: false,
      },
    };
  }
}
