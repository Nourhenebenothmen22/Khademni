import { describe, it, expect } from "vitest";
import { OnnxSemanticProvider } from "./onnx-semantic.provider.js";
import { getSemanticProvider } from "../semantic-factory.js";

describe("OnnxSemanticProvider", () => {
  const provider = new OnnxSemanticProvider();

  it("should have correct provider name", () => {
    expect(provider.name).toBe("onnx-transformer");
  });

  it("should resolve onnx provider from factory when algorithmKey is onnx or transformer", () => {
    const p1 = getSemanticProvider("onnx-minilm");
    expect(p1.name).toBe("onnx-transformer");

    const p2 = getSemanticProvider("transformer-model");
    expect(p2.name).toBe("onnx-transformer");
  });

  it("should calculate similarity between job and candidate text or fallback gracefully", async () => {
    const jobText = "Senior Mathematics Teacher with calculus and algebra experience.".repeat(50);
    const candText = "Mathematics teacher possessing strong calculus and linear algebra background.".repeat(50);

    const result = await provider.computeSimilarity(jobText, candText);

    expect(result).toHaveProperty("similarityScore");
    expect(result).toHaveProperty("vectorSimilarity");
    expect(result.similarityScore).toBeGreaterThanOrEqual(0);
    expect(result.similarityScore).toBeLessThanOrEqual(100);
    expect(["onnx-transformer", "tfidf-fallback"]).toContain(result.providerName);
    if (result.providerName === "onnx-transformer") {
      expect(result.metadata?.inputLengthJob).toBeGreaterThan(0);
      expect(result.metadata?.chunkingMode).toBe("mean-pooling-multi-chunk");
    }
  }, 60000);
});
