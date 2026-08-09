import type { ISemanticProvider, SemanticEmbeddingResult } from "../semantic-provider.interface.js";
import { TfidfSemanticProvider } from "./tfidf-semantic.provider.js";
import { logger } from "../../../lib/logger.js";

type ExtractorFunction = (text: string, options?: { pooling?: string; normalize?: boolean }) => Promise<{ data: Float32Array | number[] }>;

let pipelinePromise: Promise<ExtractorFunction> | null = null;

async function getExtractorPipeline(): Promise<ExtractorFunction> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import("@xenova/transformers");
      env.allowLocalModels = true;
      env.allowRemoteModels = true;

      const pipelineCall = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

      const timeoutCall = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ONNX model load timeout (5000ms limit reached)")), 5000),
      );

      return Promise.race([pipelineCall, timeoutCall]) as Promise<ExtractorFunction>;
    })().catch((error) => {
      pipelinePromise = null;
      throw error;
    });
  }
  return pipelinePromise;
}

export class OnnxSemanticProvider implements ISemanticProvider {
  public readonly name = "onnx-transformer";
  private fallbackProvider = new TfidfSemanticProvider();

  public async generateVector(text: string): Promise<number[]> {
    const extractor = await getExtractorPipeline();
    const chunkSize = 1500;
    const chunks: string[] = [];

    const cleanText = text.trim();
    if (!cleanText) return new Array(384).fill(0);

    for (let i = 0; i < cleanText.length; i += chunkSize) {
      chunks.push(cleanText.substring(i, i + chunkSize));
    }

    const chunkVectors: number[][] = [];
    for (const chunk of chunks.slice(0, 4)) {
      // Yield to Node.js event loop to prevent event-loop starvation during neural inference
      await new Promise((resolve) => setImmediate(resolve));
      const output = await extractor(chunk, { pooling: "mean", normalize: true });
      chunkVectors.push(Array.from(output.data as Float32Array));
    }

    const firstChunk = chunkVectors[0];
    if (!firstChunk) return new Array(384).fill(0);

    const dimension = firstChunk.length;
    const finalVector = new Array(dimension).fill(0);

    for (let i = 0; i < dimension; i++) {
      let sum = 0;
      for (const vec of chunkVectors) {
        sum += vec[i] ?? 0;
      }
      finalVector[i] = sum / chunkVectors.length;
    }

    return finalVector;
  }

  private computeCosineSimilarity(v1: number[], v2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    const len = Math.min(v1.length, v2.length);

    for (let i = 0; i < len; i++) {
      const val1 = v1[i] ?? 0;
      const val2 = v2[i] ?? 0;
      dotProduct += val1 * val2;
      norm1 += val1 * val1;
      norm2 += val2 * val2;
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (denominator === 0) return 0;
    return Math.max(0, Math.min(1, dotProduct / denominator));
  }

  public async computeSimilarity(
    jobText: string,
    candidateText: string,
  ): Promise<SemanticEmbeddingResult> {
    try {
      const jobVector = await this.generateVector(jobText);
      const candidateVector = await this.generateVector(candidateText);

      const cosineSim = this.computeCosineSimilarity(jobVector, candidateVector);
      const similarityScore = Math.min(100, Math.round(cosineSim * 100 * 100) / 100);

      return {
        similarityScore,
        vectorSimilarity: Math.round(cosineSim * 10000) / 10000,
        providerName: this.name,
        metadata: {
          model: "Xenova/all-MiniLM-L6-v2",
          vectorDimension: jobVector.length,
          onnxActive: true,
          inputLengthJob: jobText.length,
          inputLengthCandidate: candidateText.length,
          chunkingMode: "mean-pooling-multi-chunk",
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.warn(
        { err: message },
        "ONNX transformer model execution failed, falling back to TF-IDF semantic provider.",
      );
      return this.fallbackProvider.computeSimilarity(jobText, candidateText);
    }
  }
}
