import type { ISemanticProvider, SemanticEmbeddingResult } from "../semantic-provider.interface.js";

const DEFAULT_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "when", "at",
  "by", "for", "with", "about", "against", "between", "into", "through",
  "during", "before", "after", "above", "below", "to", "from", "up", "down",
  "in", "out", "on", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "any",
  "both", "each", "few", "more", "most", "other", "some", "such", "no",
  "nor", "not", "only", "own", "same", "so", "than", "too", "very", "is",
  "are", "was", "were", "be", "been", "being", "have", "has", "had", "having",
  "do", "does", "did", "doing", "would", "could", "should", "now"
]);

export class TfidfSemanticProvider implements ISemanticProvider {
  public readonly name = "tfidf-fallback";

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9+#\s-]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 2 && !DEFAULT_STOP_WORDS.has(term));
  }

  private buildFrequencyMap(tokens: string[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const token of tokens) {
      map.set(token, (map.get(token) || 0) + 1);
    }
    return map;
  }

  private computeNorm(map: Map<string, number>): number {
    let sumSq = 0;
    for (const val of map.values()) {
      sumSq += val * val;
    }
    return Math.sqrt(sumSq);
  }

  public async computeSimilarity(
    jobText: string,
    candidateText: string,
  ): Promise<SemanticEmbeddingResult> {
    const jobTokens = this.tokenize(jobText);
    const candidateTokens = this.tokenize(candidateText);

    if (jobTokens.length === 0 || candidateTokens.length === 0) {
      return {
        similarityScore: 0,
        vectorSimilarity: 0,
        providerName: this.name,
        metadata: { jobTermCount: jobTokens.length, candidateTermCount: candidateTokens.length },
      };
    }

    const jobTf = this.buildFrequencyMap(jobTokens);
    const candidateTf = this.buildFrequencyMap(candidateTokens);

    const jobNorm = this.computeNorm(jobTf);
    const candidateNorm = this.computeNorm(candidateTf);

    if (jobNorm === 0 || candidateNorm === 0) {
      return {
        similarityScore: 0,
        vectorSimilarity: 0,
        providerName: this.name,
        metadata: { jobTermCount: jobTokens.length, candidateTermCount: candidateTokens.length },
      };
    }

    let dotProduct = 0;
    const sharedTerms: string[] = [];

    for (const [term, jobFreq] of jobTf.entries()) {
      const candFreq = candidateTf.get(term);
      if (candFreq !== undefined) {
        dotProduct += jobFreq * candFreq;
        sharedTerms.push(term);
      }
    }

    const cosineSimilarity = dotProduct / (jobNorm * candidateNorm);
    const similarityScore = Math.min(100, Math.round(cosineSimilarity * 100 * 100) / 100);

    return {
      similarityScore,
      vectorSimilarity: Math.round(cosineSimilarity * 10000) / 10000,
      providerName: this.name,
      metadata: {
        sharedTerms: sharedTerms.slice(0, 15),
        jobTermCount: jobTokens.length,
        candidateTermCount: candidateTokens.length,
      },
    };
  }
}
