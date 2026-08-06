import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../common/errors/app-error.js";
import { logger } from "../../lib/logger.js";
import { parseDocument } from "./document-parser.service.js";
import { getSemanticProvider } from "./semantic-factory.js";
import type { MatchingRunQuery } from "../../common/validators/matching-run.validators.js";
import type { ScoreRecommendation } from "../../generated/prisma/client.js";

/**
 * Interface defining dynamic model hyperparameters.
 * All parameters are dynamic with zero hardcoding in business logic.
 */
interface ModelHyperparameters {
  ruleWeight?: number;
  semanticWeight?: number;
  keywordWeight?: number;
  rulesWeight?: number;
  keywordTypeMultipliers?: Record<string, number>;
  degreeHierarchy?: Record<string, number>;
  recommendationThresholds?: {
    highlyRecommended?: number;
    recommended?: number;
    average?: number;
  };
}

/**
 * Gets rank for a degree based on dynamic model hierarchy configuration.
 */
function getDegreeRank(text: string, degreeHierarchy: Record<string, number>): number {
  let highest = 0;
  const lower = text.toLowerCase();
  for (const [degreeName, rank] of Object.entries(degreeHierarchy)) {
    if (lower.includes(degreeName.toLowerCase()) && rank > highest) {
      highest = rank;
    }
  }
  return highest;
}

export async function runMatching(
  applicationId: string,
  modelId: string,
  organizationId?: string,
) {
  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      ...(organizationId ? { jobPost: { organizationId } } : {}),
    },
    include: {
      candidate: true,
      jobPost: {
        include: { keywords: true, matchingRules: true },
      },
      documents: {
        include: { parseResult: true },
      },
    },
  });

  if (!application) throw new AppError("Application not found or access denied", 404);
  if (!application.jobPost) throw new AppError("Job post not found", 404);

  const model = await prisma.aIMatchingModel.findUnique({
    where: { id: modelId },
  });

  if (!model) throw new AppError("Model not found", 404);

  let run = await prisma.matchingRun.create({
    data: {
      applicationId,
      modelId,
      status: "PENDING",
    },
  });

  run = await prisma.matchingRun.update({
    where: { id: run.id },
    data: { status: "RUNNING" },
  });

  try {
    // ─── Load Dynamic Hyperparameters from Model ────────────────────
    const hyper = (model.hyperparameters as ModelHyperparameters) || {};

    const ruleWeight = hyper.ruleWeight ?? 0.7;
    const semanticWeight = hyper.semanticWeight ?? 0.3;
    const kwWeight = hyper.keywordWeight ?? 0.5;
    const rlWeight = hyper.rulesWeight ?? 0.5;

    const kwMultipliers: Record<string, number> = {
      REQUIRED: 3.0,
      OPTIONAL: 1.0,
      BONUS: 0.5,
      ...(hyper.keywordTypeMultipliers || {}),
    };

    const degreeHierarchy: Record<string, number> = {
      diploma: 1,
      associate: 1,
      bachelor: 2,
      bs: 2,
      ba: 2,
      bed: 2,
      master: 3,
      ms: 3,
      ma: 3,
      med: 3,
      phd: 4,
      doctorate: 4,
      ...(hyper.degreeHierarchy || {}),
    };

    const recThresholds = {
      highlyRecommended: hyper.recommendationThresholds?.highlyRecommended ?? 80,
      recommended: hyper.recommendationThresholds?.recommended ?? 60,
      average: hyper.recommendationThresholds?.average ?? 40,
    };

    // ─── Extract Candidate Text ──────────────────────────────────────
    const parsedTexts: string[] = [];

    for (const doc of application.documents) {
      if (!doc.parseResult && doc.status !== "REJECTED") {
        try {
          const result = await parseDocument(doc.id);
          parsedTexts.push(result.extractedText);
        } catch (error) {
          logger.error({ error, documentId: doc.id }, "Failed to parse document");
        }
      } else if (doc.parseResult) {
        parsedTexts.push(doc.parseResult.extractedText);
      }
    }

    if (application.motivationLetter) {
      parsedTexts.push(application.motivationLetter);
    }

    const candidateText = parsedTexts.join("\n").toLowerCase();
    const jobText = `${application.jobPost.title}\n${application.jobPost.description}\n${application.jobPost.requirements}`.toLowerCase();

    // ─── 1. Dynamic Skills & Keywords Engine ────────────────────────
    let keywordsScore = 0;
    const matchedKeywords: any[] = [];
    const missingKeywords: any[] = [];

    let totalKeywordWeight = 0;
    let earnedKeywordWeight = 0;

    for (const keyword of application.jobPost.keywords) {
      const typeMult = kwMultipliers[keyword.type] ?? 1.0;
      const weight = keyword.weight * typeMult;
      totalKeywordWeight += weight;

      if (candidateText.includes(keyword.keyword.toLowerCase())) {
        earnedKeywordWeight += weight;
        matchedKeywords.push({ keyword: keyword.keyword, type: keyword.type, weight });
      } else {
        missingKeywords.push({ keyword: keyword.keyword, type: keyword.type, weight });
      }
    }

    keywordsScore = totalKeywordWeight > 0 ? (earnedKeywordWeight / totalKeywordWeight) * 100 : 100;

    // ─── 2. Dynamic Matching Rules Engine ───────────────────────────
    let rulesScore = 0;
    let totalRuleWeight = 0;
    let earnedRuleWeight = 0;
    const ruleResults: any[] = [];

    const activeRules = application.jobPost.matchingRules.filter((r) => r.isActive);

    for (const rule of activeRules) {
      totalRuleWeight += rule.weight;
      let matched = false;
      let explanation = "";
      const condition = (rule.condition as Record<string, any>) || {};

      switch (rule.type) {
        case "DEGREE": {
          const reqDegree = String(condition.value || condition.name || "").toLowerCase();
          const localHierarchy = condition.degreeHierarchy
            ? { ...degreeHierarchy, ...condition.degreeHierarchy }
            : degreeHierarchy;

          const reqRank = localHierarchy[reqDegree] || 1;
          const candRank = getDegreeRank(candidateText, localHierarchy);
          matched = candRank >= reqRank;
          explanation = matched
            ? `Degree qualification rank (${candRank}) meets required rank (${reqRank})`
            : `Degree qualification rank (${candRank}) is below required rank (${reqRank})`;
          break;
        }

        case "EXPERIENCE": {
          const reqYears = Number(condition.years || condition.value || 0);
          let detectedYears = 0;
          const expMatch = candidateText.match(/(\d+)\+?\s*(?:years?|yrs?)/);
          if (expMatch && expMatch[1]) detectedYears = parseInt(expMatch[1], 10);

          matched = detectedYears >= reqYears || candidateText.includes(`${reqYears} years`);
          explanation = matched
            ? `Experience (${detectedYears}+ years) satisfies rule requirement (${reqYears} years)`
            : `Experience (${detectedYears} years) does not satisfy requirement (${reqYears} years)`;
          break;
        }

        case "CERTIFICATION": {
          const certs: string[] = Array.isArray(condition.values)
            ? condition.values.map((v) => String(v).toLowerCase())
            : [String(condition.value || condition.name || "").toLowerCase()].filter(Boolean);

          matched = certs.some((cert) => candidateText.includes(cert));
          explanation = matched
            ? `Required certification matched in candidate profile`
            : `Required certification (${certs.join(", ")}) not found`;
          break;
        }

        case "KEYWORD":
        case "CUSTOM":
        default: {
          const val = String(condition.value || condition.keyword || condition.text || "").toLowerCase();
          if (val) {
            matched = candidateText.includes(val);
            explanation = matched ? `Condition value "${val}" satisfied` : `Condition value "${val}" not satisfied`;
          } else if (Array.isArray(condition.values)) {
            matched = condition.values.some((v) => candidateText.includes(String(v).toLowerCase()));
            explanation = matched ? "Condition values list satisfied" : "No condition values satisfied";
          } else {
            matched = true;
            explanation = "Condition default evaluated as true";
          }
          break;
        }
      }

      if (matched) earnedRuleWeight += rule.weight;
      ruleResults.push({
        ruleId: rule.id,
        ruleName: rule.ruleName,
        type: rule.type,
        weight: rule.weight,
        matched,
        explanation,
      });
    }

    rulesScore = totalRuleWeight > 0 ? (earnedRuleWeight / totalRuleWeight) * 100 : 100;

    // Dynamic Rule-Based Score combination
    let ruleBasedScore = 100;
    const hasKw = application.jobPost.keywords.length > 0;
    const hasRl = activeRules.length > 0;

    if (hasKw && hasRl) {
      const kwNorm = kwWeight / (kwWeight + rlWeight);
      const rlNorm = rlWeight / (kwWeight + rlWeight);
      ruleBasedScore = keywordsScore * kwNorm + rulesScore * rlNorm;
    } else if (hasKw) {
      ruleBasedScore = keywordsScore;
    } else if (hasRl) {
      ruleBasedScore = rulesScore;
    }

    // ─── 3. Phase 2 Provider-Independent Semantic Score ────────────
    const semanticProvider = getSemanticProvider(model.algorithm);
    const semanticResult = await semanticProvider.computeSimilarity(jobText, candidateText);
    const semanticScore = semanticResult.similarityScore;

    // ─── 4. Dynamic Hybrid Score Combination ───────────────────────
    const ruleNorm = ruleWeight / (ruleWeight + semanticWeight);
    const semanticNorm = semanticWeight / (ruleWeight + semanticWeight);

    const totalScore = Math.round((ruleBasedScore * ruleNorm + semanticScore * semanticNorm) * 100) / 100;

    // Recommendation logic driven by model recommendationThresholds
    let recommendation: ScoreRecommendation = "NOT_RECOMMENDED";
    if (totalScore >= recThresholds.highlyRecommended) recommendation = "HIGHLY_RECOMMENDED";
    else if (totalScore >= recThresholds.recommended) recommendation = "RECOMMENDED";
    else if (totalScore >= recThresholds.average) recommendation = "AVERAGE";
    else recommendation = "NOT_RECOMMENDED";

    const explanationText = `Dynamic hybrid score ${totalScore}% (Rule-based: ${ruleBasedScore.toFixed(1)}% @ ${(ruleNorm * 100).toFixed(0)}% weight, Semantic [${semanticProvider.name}]: ${semanticScore.toFixed(1)}% @ ${(semanticNorm * 100).toFixed(0)}% weight). Keywords matched ${matchedKeywords.length}/${application.jobPost.keywords.length}, Rules satisfied ${ruleResults.filter((r) => r.matched).length}/${activeRules.length}.`;

    // ─── 5. Database Persistence ──────────────────────────────────
    run = await prisma.matchingRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        totalScore,
        confidence: 0.95,
        matchedKeywords,
        missingKeywords,
        ruleResults,
        scoreBreakdown: {
          keywordsScore: Math.round(keywordsScore * 100) / 100,
          rulesScore: Math.round(rulesScore * 100) / 100,
          ruleBasedScore: Math.round(ruleBasedScore * 100) / 100,
          semanticScore: Math.round(semanticScore * 100) / 100,
          hybridScore: totalScore,
          ruleWeight: ruleNorm,
          semanticWeight: semanticNorm,
          providerUsed: semanticProvider.name,
        },
        semanticResult: semanticResult as any,
        explanation: explanationText,
        finishedAt: new Date(),
      },
    });

    await prisma.applicationScore.upsert({
      where: { applicationId },
      create: {
        applicationId,
        matchingRunId: run.id,
        finalScore: totalScore,
        recommendation,
        explanation: explanationText,
      },
      update: {
        matchingRunId: run.id,
        finalScore: totalScore,
        recommendation,
        explanation: explanationText,
        calculatedAt: new Date(),
      },
    });

    logger.info(
      { applicationId, runId: run.id, totalScore, recommendation, provider: semanticProvider.name },
      "Fully dynamic AI Matching run completed successfully",
    );

    return run;
  } catch (error) {
    await prisma.matchingRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function runMatchingForJob(
  jobPostId: string,
  modelId: string,
  organizationId?: string,
) {
  const job = await prisma.jobPost.findFirst({
    where: { id: jobPostId, ...(organizationId ? { organizationId } : {}) },
  });

  if (!job) throw new AppError("Job post not found or access denied", 404);

  const applications = await prisma.application.findMany({
    where: { jobPostId, status: { notIn: ["WITHDRAWN", "REJECTED"] } },
  });

  const runs = [];
  for (const app of applications) {
    const run = await runMatching(app.id, modelId);
    runs.push(run);
  }

  return runs;
}

export async function getMatchingRun(runId: string, organizationId?: string) {
  const run = await prisma.matchingRun.findFirst({
    where: {
      id: runId,
      ...(organizationId ? { application: { jobPost: { organizationId } } } : {}),
    },
    include: {
      application: {
        include: { candidate: { select: { id: true, fullName: true, email: true } } },
      },
      model: true,
      applicationScore: true,
    },
  });

  if (!run) throw new AppError("Matching run not found or access denied", 404);
  return run;
}

export async function getMatchingRuns(
  query: MatchingRunQuery,
  organizationId?: string,
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (organizationId) {
    where.application = { jobPost: { organizationId } };
  }
  if (query.applicationId) where.applicationId = query.applicationId;
  if (query.modelId) where.modelId = query.modelId;
  if (query.status) where.status = query.status;

  const [total, items] = await Promise.all([
    prisma.matchingRun.count({ where }),
    prisma.matchingRun.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [query.sortBy || "startedAt"]: query.sortOrder || "desc" },
      include: {
        model: { select: { id: true, name: true, version: true } },
        applicationScore: true,
      },
    }),
  ]);

  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getApplicationScore(
  applicationId: string,
  organizationId?: string,
) {
  const score = await prisma.applicationScore.findFirst({
    where: {
      applicationId,
      ...(organizationId ? { application: { jobPost: { organizationId } } } : {}),
    },
    include: {
      matchingRun: true,
    },
  });

  if (!score) throw new AppError("Application score not found or access denied", 404);
  return score;
}
