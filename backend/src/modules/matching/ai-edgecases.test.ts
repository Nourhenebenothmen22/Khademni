import { describe, it, expect } from "vitest";
import { OnnxSemanticProvider } from "./providers/onnx-semantic.provider.js";
import { TfidfSemanticProvider } from "./providers/tfidf-semantic.provider.js";
import { getDegreeRank, extractExperienceYears, calculateDynamicConfidence } from "./matching.service.js";
import { parseCandidateProfileStructured } from "./llm-parser.service.js";

describe("QA & Edge-Cases Test Suite — AI Recruitment Module", () => {
  describe("1. Document Parser & Encoding Edge Cases", () => {
    it("should handle multi-language French, Arabic, and accented text cleanly", () => {
      const frenchArabicText = "Enseignant d'Éducation Physique et Sportive (EPS) - diplômé de l'Institut Supérieur de l'Éducation avec 5 ans d'expérience أستاذ réputé.";
      
      const years = extractExperienceYears(frenchArabicText);
      expect(years).toBe(5);

      const rank = getDegreeRank(frenchArabicText, { diploma: 1, bachelor: 2, master: 3 });
      expect(rank).toBeGreaterThanOrEqual(0);
    });

    it("should process large multi-paragraph text (simulating 50-page CV) without memory bloat", async () => {
      const provider = new OnnxSemanticProvider();
      const largeParagraph = "Secondary Mathematics and Physics Teacher with extensive curriculum development experience. ".repeat(100);
      const largeText = (largeParagraph + "\n").repeat(50); // ~50 pages of repeated content

      const vector = await provider.generateVector(largeText);

      expect(vector).toHaveLength(384);
      expect(vector.some((v) => v !== 0)).toBe(true);
    }, 60000);
  });

  describe("2. LLM Candidate Parser Resiliency", () => {
    it("should handle null or invalid structural fields gracefully via Zod fallback defaults", async () => {
      const parsed = await parseCandidateProfileStructured("");

      expect(parsed).toBeDefined();
      expect(parsed.highestDegree.level).toBe("NONE");
      expect(parsed.totalYearsOfRelevantExperience).toBe(0);
      expect(parsed.coreSkills).toEqual([]);
      expect(parsed.workHistory).toEqual([]);
    });
  });

  describe("3. Dynamic Confidence Calculation Bounds", () => {
    it("should clamp dynamic confidence between 0.50 and 0.99 for edge-case scores", () => {
      const lowConfidence = calculateDynamicConfidence({
        parseQuality: 0.0,
        keywordCoverage: 0.0,
        ruleCompleteness: 0.0,
        semanticScore: 0,
      });

      const highConfidence = calculateDynamicConfidence({
        parseQuality: 1.0,
        keywordCoverage: 1.0,
        ruleCompleteness: 1.0,
        semanticScore: 100,
      });

      expect(lowConfidence).toBe(0.50);
      expect(highConfidence).toBe(0.99);
    });
  });

  describe("4. Provider Fallback Consistency", () => {
    it("should return consistent TF-IDF scores on identical candidate and job text", async () => {
      const tfidf = new TfidfSemanticProvider();
      const text = "Secondary Mathematics Teacher Calculus Algebra";

      const res = await tfidf.computeSimilarity(text, text);

      expect(res.similarityScore).toBe(100);
      expect(res.vectorSimilarity).toBe(1);
    });
  });
});
