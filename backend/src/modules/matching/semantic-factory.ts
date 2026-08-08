import type { ISemanticProvider } from "./semantic-provider.interface.js";
import { TfidfSemanticProvider } from "./providers/tfidf-semantic.provider.js";
import { PgVectorSemanticProvider } from "./providers/pgvector-semantic.provider.js";
import { OnnxSemanticProvider } from "./providers/onnx-semantic.provider.js";
import { env } from "../../config/env.js";

const pgVectorProvider = new PgVectorSemanticProvider();
const tfidfProvider = new TfidfSemanticProvider();
const onnxProvider = new OnnxSemanticProvider();

/**
 * Resolves the appropriate semantic embedding provider dynamically based on model algorithm key
 * or env.SEMANTIC_PROVIDER configuration.
 */
export function getSemanticProvider(algorithmKey?: string): ISemanticProvider {
  const targetKey = (algorithmKey || env.SEMANTIC_PROVIDER).toLowerCase();

  if (targetKey.includes("onnx") || targetKey.includes("transformer")) {
    return onnxProvider;
  }
  if (targetKey.includes("tfidf")) {
    return tfidfProvider;
  }
  if (targetKey.includes("pgvector") || targetKey.includes("vector") || targetKey.includes("hnsw")) {
    return pgVectorProvider;
  }

  return pgVectorProvider;
}

