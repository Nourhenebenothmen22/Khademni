export interface SemanticEmbeddingResult {
  similarityScore: number; // 0.0 to 100.0
  vectorSimilarity: number; // 0.0 to 1.0
  providerName: string;
  metadata?: Record<string, unknown>;
}

export interface ISemanticProvider {
  readonly name: string;
  computeSimilarity(jobText: string, candidateText: string): Promise<SemanticEmbeddingResult>;
}
