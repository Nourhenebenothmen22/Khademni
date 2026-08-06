import type { ISemanticProvider, SemanticEmbeddingResult } from "../semantic-provider.interface.js";
import { TfidfSemanticProvider } from "./tfidf-semantic.provider.js";
import { logger } from "../../../lib/logger.js";

let pipelinePromise: Promise<any> | null = null;
const MAX_INPUT_CHARACTERS = 2048; // Max ~350-400 words aligned with 512-token context limit of all-MiniLM-L6-v2

async function getExtractorPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import("@xenova/transformers");
      env.allowLocalModels = true;
      env.allowRemoteModels = true;

      const pipelineCall = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

      const timeoutCall = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("ONNX model load timeout (5000ms limit reached)")), 5000),
      );

      return Promise.race([pipelineCall, timeoutCall]);
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
      const extractor = await getExtractorPipeline();

      // Truncate to MAX_INPUT_CHARACTERS (2048) to fit 512-token transformer context without memory bloat
      const truncatedJob = jobText.substring(0, MAX_INPUT_CHARACTERS);
      const truncatedCandidate = candidateText.substring(0, MAX_INPUT_CHARACTERS);

      const jobOutput = await extractor(truncatedJob, { pooling: "mean", normalize: true });
      const candidateOutput = await extractor(truncatedCandidate, { pooling: "mean", normalize: true });

      const jobVector = Array.from(jobOutput.data as Float32Array) as number[];
      const candidateVector = Array.from(candidateOutput.data as Float32Array) as number[];

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
          inputLengthJob: truncatedJob.length,
          inputLengthCandidate: truncatedCandidate.length,
        },
      };
    } catch (err: any) {
      logger.warn(
        { err: err?.message },
        "ONNX transformer model execution failed, falling back to TF-IDF semantic provider.",
      );
      return this.fallbackProvider.computeSimilarity(jobText, candidateText);
    }
  }
}
