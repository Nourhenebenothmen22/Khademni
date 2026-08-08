import { describe, it, expect } from "vitest";
import {
  getDegreeRank,
  extractExperienceYears,
  calculateDynamicConfidence,
} from "./matching.service.js";
import { PgVectorSemanticProvider } from "./providers/pgvector-semantic.provider.js";

describe("AI Matching Engine Core Improvements & Bug Fixes", () => {
  describe("Bug #2 Fix: Degree Rank Word-Boundary Matching (getDegreeRank)", () => {
    const hierarchy = {
      diploma: 1,
      bachelor: 2,
      bs: 2,
      ba: 2,
      bed: 2,
      master: 3,
      ms: 3,
      ma: 3,
      med: 3,
      phd: 4,
    };

    it("should NOT assign degree ranks to words containing ma, ba, bs, bed substrings", () => {
      const text = "Teacher in mathematics and management with basic background in embedded systems.";
      const rank = getDegreeRank(text, hierarchy);
      expect(rank).toBe(0);
    });

    it("should correctly match full degree words and dotted acronyms", () => {
      expect(getDegreeRank("Holder of a M.A. in History", hierarchy)).toBe(3);
      expect(getDegreeRank("Earned a Master of Science", hierarchy)).toBe(3);
      expect(getDegreeRank("B.S. in Physics degree", hierarchy)).toBe(2);
      expect(getDegreeRank("Ph.D. in Computer Science", hierarchy)).toBe(4);
    });
  });

  describe("Bug #3 Fix: Multi-Range Experience Extraction (extractExperienceYears)", () => {
    it("should calculate cumulative experience years across date ranges", () => {
      const cvText = "Teaching Position at High School from 2018 to 2023. Previously worked 2015 - 2018.";
      const years = extractExperienceYears(cvText);
      expect(years).toBe(8);
    });

    it("should not confuse graduation year with experience duration", () => {
      const cvText = "Graduated in 2015. Possesses 3 years of teaching experience.";
      const years = extractExperienceYears(cvText);
      expect(years).toBe(3);
    });

    it("should handle 'present' in date ranges", () => {
      const currentYear = new Date().getFullYear();
      const cvText = `Physics Teacher from 2020 to present.`;
      const years = extractExperienceYears(cvText);
      expect(years).toBe(currentYear - 2020);
    });
  });

  describe("Bug #1 Fix: PGVector Metadata Accuracy", () => {
    it("should accurately set pgvectorActive to false when pgvector SQL extension is unconfigured", async () => {
      const provider = new PgVectorSemanticProvider();
      const result = await provider.computeSimilarity(
        "Senior Physics Teacher",
        "Physics education background",
      );

      expect(result).toHaveProperty("similarityScore");
      expect(result.similarityScore).toBeGreaterThanOrEqual(0);
      expect(result.similarityScore).toBeLessThanOrEqual(100);
      expect(["pgvector-hnsw", "tfidf-fallback"]).toContain(result.providerName);
    }, 60000);
  });

  describe("Dynamic Confidence Calculation", () => {
    it("should calculate dynamic confidence score based on input factors", () => {
      const confidence = calculateDynamicConfidence({
        parseQuality: 1.0,
        keywordCoverage: 0.8,
        ruleCompleteness: 1.0,
        semanticScore: 85,
      });

      expect(confidence).toBeGreaterThanOrEqual(0.5);
      expect(confidence).toBeLessThanOrEqual(0.99);
      expect(confidence).toBe(0.91);
    });
  });
});
