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

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@khademni.local").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "DevAdminSecret_2026!";
  const candidatePassword = process.env.SEED_CANDIDATE_PASSWORD || "DevCandidateSecret_2026!";

  if (process.env.NODE_ENV === "production" && (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_ADMIN_EMAIL)) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD environment variables are strictly required for production seeding.");
  }

  const passwordHash = await argon2.hash(adminPassword);
  const candidatePasswordHash = await argon2.hash(candidatePassword);

  // Seed Admin User (Organization Administrator)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "ORGANIZATION_ADMIN",
      organizationId: org.id,
      isEmailVerified: true,
    },
    create: {
      email: adminEmail,
      fullName: "Organization Administrator",
      passwordHash,
      role: "ORGANIZATION_ADMIN",
      isEmailVerified: true,
      organizationId: org.id,
    },
  });

  // Seed Candidate User
  const candidate = await prisma.user.upsert({
    where: { email: "candidate@khademni.local" },
    update: {},
    create: {
      email: "candidate@khademni.local",
      fullName: "Jane Candidate",
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

  // Seed Sample Job Post (idempotent)
  let job = await prisma.jobPost.findFirst({
    where: {
      title: "Senior Secondary Physics & Math Teacher",
      organizationId: org.id,
    },
  });

  if (!job) {
    job = await prisma.jobPost.create({
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
  }

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

