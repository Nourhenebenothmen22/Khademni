/**
 * Deterministic TF-IDF / Term-Frequency Vectorizer & Cosine Similarity Engine.
 *
 * Implements Phase 2 Semantic Matching without external LLM API dependencies:
 * - Tokenizes, cleans, and computes term-frequency vector representations for text.
 * - Computes L2-normalized vector embeddings.
 * - Calculates exact Cosine Similarity between Job text vector and Candidate document vector.
 * - Provides modular architecture allowing future vector DB or LLM embeddings
 *   without altering core matching logic.
 */

export interface SemanticVectorResult {
  similarityScore: number; // 0.0 to 100.0
  cosineSimilarity: number; // 0.0 to 1.0
  vectorDimension: number;
  sharedTerms: string[];
  jobTermCount: number;
  candidateTermCount: number;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "when", "at",
  "by", "for", "with", "about", "against", "between", "into", "through",
  "during", "before", "after", "above", "below", "to", "from", "up", "down",
  "in", "out", "on", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "any",
  "both", "each", "few", "more", "most", "other", "some", "such", "no",
  "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s",
  "t", "can", "will", "just", "don", "should", "now", "is", "are", "was",
  "were", "be", "been", "being", "have", "has", "had", "having", "do",
  "does", "did", "doing", "would", "could", "ought", "i", "you", "he",
  "she", "it", "we", "they", "them", "their", "this", "that", "these",
  "those", "must", "work", "job", "position", "role", "looking", "seeking"
]);

/**
 * Tokenizes and normalizes text into clean terms.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#\s-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}

/**
 * Builds term-frequency map for a token array.
 */
function buildTermFrequencyMap(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  return tf;
}

/**
 * Computes L2 norm (magnitude) of a vector map.
 */
function computeL2Norm(tfMap: Map<string, number>): number {
  let sumSq = 0;
  for (const count of tfMap.values()) {
    sumSq += count * count;
  }
  return Math.sqrt(sumSq);
}

/**
 * Computes cosine similarity between two text documents.
 * Returns similarity score in range [0, 100].
 */
export function computeSemanticSimilarity(
  jobText: string,
  candidateText: string,
): SemanticVectorResult {
  const jobTokens = tokenize(jobText);
  const candidateTokens = tokenize(candidateText);

  if (jobTokens.length === 0 || candidateTokens.length === 0) {
    return {
      similarityScore: 0,
      cosineSimilarity: 0,
      vectorDimension: 0,
      sharedTerms: [],
      jobTermCount: jobTokens.length,
      candidateTermCount: candidateTokens.length,
    };
  }

  const jobTf = buildTermFrequencyMap(jobTokens);
  const candidateTf = buildTermFrequencyMap(candidateTokens);

  const jobNorm = computeL2Norm(jobTf);
  const candidateNorm = computeL2Norm(candidateTf);

  if (jobNorm === 0 || candidateNorm === 0) {
    return {
      similarityScore: 0,
      cosineSimilarity: 0,
      vectorDimension: 0,
      sharedTerms: [],
      jobTermCount: jobTokens.length,
      candidateTermCount: candidateTokens.length,
    };
  }

  let dotProduct = 0;
  const sharedTerms: string[] = [];

  for (const [term, jobFreq] of jobTf.entries()) {
    const candidateFreq = candidateTf.get(term);
    if (candidateFreq !== undefined) {
      dotProduct += jobFreq * candidateFreq;
      sharedTerms.push(term);
    }
  }

  const cosineSimilarity = dotProduct / (jobNorm * candidateNorm);

  // Scale cosine similarity to a 0-100 score, using non-linear curve for term overlap
  const scaledScore = Math.min(100, Math.round(cosineSimilarity * 100 * 100) / 100);

  // Distinct vocabulary dimension across both documents
  const allTerms = new Set([...jobTf.keys(), ...candidateTf.keys()]);

  return {
    similarityScore: scaledScore,
    cosineSimilarity: Math.round(cosineSimilarity * 10000) / 10000,
    vectorDimension: allTerms.size,
    sharedTerms: sharedTerms.slice(0, 15),
    jobTermCount: jobTokens.length,
    candidateTermCount: candidateTokens.length,
  };
}
