import type { ISemanticProvider } from "./semantic-provider.interface.js";
import { TfidfSemanticProvider } from "./providers/tfidf-semantic.provider.js";
import { PgVectorSemanticProvider } from "./providers/pgvector-semantic.provider.js";

const pgVectorProvider = new PgVectorSemanticProvider();
const tfidfProvider = new TfidfSemanticProvider();

const providersMap: Record<string, ISemanticProvider> = {
  "pgvector": pgVectorProvider,
  "vector": pgVectorProvider,
  "hnsw": pgVectorProvider,
  "tfidf": tfidfProvider,
};

/**
 * Resolves the appropriate semantic embedding provider dynamically based on model algorithm key.
 * Defaults to PgVectorSemanticProvider for high-speed vector similarity.
 */
export function getSemanticProvider(algorithmKey?: string): ISemanticProvider {
  if (!algorithmKey) {
    return pgVectorProvider;
  }

  const normalized = algorithmKey.toLowerCase();
  if (normalized.includes("tfidf")) {
    return tfidfProvider;
  }

  return pgVectorProvider;
}
