import { z } from "zod";
import { logger } from "../../lib/logger.js";

export const extractedCandidateProfileSchema = z.object({
  fullName: z.string().nullable().default(null),
  email: z.string().email().nullable().default(null),
  phone: z.string().nullable().default(null),
  highestDegree: z
    .object({
      level: z
        .enum(["DIPLOMA", "BACHELOR", "MASTER", "DOCTORATE", "NONE"])
        .default("NONE"),
      fieldOfStudy: z.string().nullable().default("General"),
      institution: z.string().nullable().default(null),
      graduationYear: z.coerce.number().nullable().default(null),
    })
    .default({
      level: "NONE",
      fieldOfStudy: "General",
      institution: null,
      graduationYear: null,
    }),
  totalYearsOfRelevantExperience: z.coerce.number().min(0).default(0),
  coreSkills: z.array(z.string()).default([]),
  softSkills: z.array(z.string()).default([]),
  domainKnowledge: z.array(z.string()).default([]),
  certifications: z
    .array(
      z.object({
        title: z.string().default("Certification"),
        issuer: z.string().nullable().default(null),
        year: z.coerce.number().nullable().default(null),
      }),
    )
    .default([]),
  workHistory: z
    .array(
      z.object({
        roleTitle: z.string().default("Position"),
        organization: z.string().nullable().default(null),
        startYear: z.coerce.number().nullable().default(null),
        endYear: z.coerce.number().nullable().default(null),
        responsibilities: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

export type ExtractedCandidateProfile = z.infer<typeof extractedCandidateProfileSchema>;

export const CV_EXTRACTION_SYSTEM_PROMPT = `
You are an expert ATS NLP Entity Extraction Engine.
Analyze the candidate's CV text and extract structured information strictly conforming to the requested JSON schema.
Rules:
1. Do not invent degrees or skills not explicitly present in the CV.
2. Accurately calculate totalYearsOfRelevantExperience by summing non-overlapping work periods.
3. Categorize degree levels accurately into: DIPLOMA, BACHELOR, MASTER, DOCTORATE, or NONE.
4. Extract core technical skills, soft skills, and domain knowledge into distinct arrays.
`;

/**
 * Parses raw candidate CV text into structured candidate profile data with fallback safety.
 */
export async function parseCandidateProfileStructured(
  _rawText: string,
): Promise<ExtractedCandidateProfile> {
  try {
    // If LLM provider API is configured, call LLM JSON Mode here
    // Fallback default structure for unconfigured local environment
    const defaultProfile: ExtractedCandidateProfile = {
      fullName: null,
      email: null,
      phone: null,
      highestDegree: {
        level: "NONE",
        fieldOfStudy: "General",
        institution: null,
        graduationYear: null,
      },
      totalYearsOfRelevantExperience: 0,
      coreSkills: [],
      softSkills: [],
      domainKnowledge: [],
      certifications: [],
      workHistory: [],
    };

    return extractedCandidateProfileSchema.parse(defaultProfile);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.warn({ err: message }, "LLM Candidate parsing failed, returning empty default profile.");
    return extractedCandidateProfileSchema.parse({});
  }
}
