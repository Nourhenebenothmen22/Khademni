import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import argon2 from "argon2";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is required to run prisma seed script.");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Seed default Organization
  const org = await prisma.organization.upsert({
    where: { slug: "khademni-edu" },
    update: {},
    create: {
      name: "Khademni Education System",
      slug: "khademni-edu",
      domain: "khademni.com",
      isActive: true,
    },
  });

  const passwordHash = await argon2.hash("AdminPassword123!");
  const candidatePasswordHash = await argon2.hash("CandidatePassword123!");

  // Seed Admin User (Nourhene)
  const admin = await prisma.user.upsert({
    where: { email: "benothmennourhene9@gmail.com" },
    update: {
      role: "ADMIN",
      organizationId: org.id,
      isEmailVerified: true,
    },
    create: {
      email: "benothmennourhene9@gmail.com",
      fullName: "Nourhene Ben Othmen",
      passwordHash,
      role: "ADMIN",
      isEmailVerified: true,
      organizationId: org.id,
    },
  });

  // Seed Candidate User
  const candidate = await prisma.user.upsert({
    where: { email: "candidate@example.com" },
    update: {},
    create: {
      email: "candidate@example.com",
      fullName: "Jane Teacher",
      passwordHash: candidatePasswordHash,
      role: "CANDIDATE",
      isEmailVerified: true,
    },
  });

  // Seed Active AI Matching Model
  const model = await prisma.aIMatchingModel.upsert({
    where: { id: "model-v1-hybrid" },
    update: { isActive: true },
    create: {
      id: "model-v1-hybrid",
      name: "Hybrid Keyword-Rule-TFIDF Matching Engine",
      version: "1.0.0",
      algorithm: "HYBRID_KEYWORD_RULE_TFIDF",
      description: "Default deterministic 3-part composite scoring engine (40% Keywords + 35% Rules + 25% TF-IDF).",
      isActive: true,
      hyperparameters: {
        keywordWeight: 0.40,
        ruleWeight: 0.35,
        semanticWeight: 0.25,
        recommendationThresholds: {
          highlyRecommended: 85,
          recommended: 70,
          average: 50,
        },
      },
    },
  });

  // Seed Sample Job Post
  const job = await prisma.jobPost.create({
    data: {
      title: "Senior Secondary Physics & Math Teacher",
      description: "Looking for an experienced secondary school Physics and Mathematics teacher with strong curriculum knowledge.",
      requirements: "Master or Bachelor degree in Physics/Mathematics with 3+ years teaching experience.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdById: admin.id,
      organizationId: org.id,
      keywords: {
        create: [
          { keyword: "Physics", type: "REQUIRED", weight: 1.5 },
          { keyword: "Mathematics", type: "REQUIRED", weight: 1.5 },
          { keyword: "Curriculum", type: "OPTIONAL", weight: 1.0 },
          { keyword: "Pedagogy", type: "BONUS", weight: 0.5 },
        ],
      },
      matchingRules: {
        create: [
          {
            ruleName: "Minimum Experience Requirement",
            type: "EXPERIENCE",
            condition: { minYears: 3 },
            weight: 1.2,
          },
          {
            ruleName: "Required Degree Level",
            type: "DEGREE",
            condition: { allowedDegrees: ["Bachelor", "Master", "PhD"] },
            weight: 1.0,
          },
        ],
      },
    },
  });

  console.log(`Seeding finished successfully. Org: ${org.name}, Admin: ${admin.email}, Candidate: ${candidate.email}, Job: ${job.title}, Model: ${model.name}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seeding error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

