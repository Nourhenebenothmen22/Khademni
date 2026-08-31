import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken } from "../../lib/jwt.js";

describe("AI Benchmark Models API Integration Tests", () => {
  let orgAdminToken: string;
  let candidateToken: string;
  let orgAdminUserId: string;
  let candidateUserId: string;
  let orgId: string;
  let createdModelId: string;
  let csrfToken: string;
  let csrfCookie: string;

  beforeAll(async () => {
    const csrfRes = await request(app)
      .get("/api/v1/auth/csrf")
      .set("Origin", "http://localhost:3001");
    csrfToken = csrfRes.body.data.csrfToken;
    const cookies = csrfRes.headers["set-cookie"] as unknown as string[];
    csrfCookie = Array.isArray(cookies) ? cookies.join("; ") : cookies;

    const org = await prisma.organization.create({
      data: {
        name: `AI Test Org ${Date.now()}`,
        slug: `ai-test-org-${Date.now()}`,
      },
    });
    orgId = org.id;

    // Organization Admin:
    const orgAdmin = await prisma.user.create({
      data: {
        email: `orgadmin_ai_${Date.now()}@school.edu`,
        passwordHash: "hash",
        fullName: "Org Admin",
        role: "ORGANIZATION_ADMIN",
        organizationId: orgId,
      },
    });
    orgAdminUserId = orgAdmin.id;

    // Candidate:
    const candidate = await prisma.user.create({
      data: {
        email: `candidate_ai_${Date.now()}@test.com`,
        passwordHash: "hash",
        fullName: "Candidate User",
        role: "CANDIDATE",
      },
    });
    candidateUserId = candidate.id;

    orgAdminToken = await signAccessToken({
      userId: orgAdmin.id,
      role: "ORGANIZATION_ADMIN",
      organizationId: orgId,
    });

    candidateToken = await signAccessToken({
      userId: candidate.id,
      role: "CANDIDATE",
      organizationId: null,
    });
  }, 30000);

  afterAll(async () => {
    if (createdModelId) {
      await prisma.aIMatchingModelEvaluation.deleteMany({ where: { modelId: createdModelId } }).catch(() => {});
      await prisma.aIMatchingModel.delete({ where: { id: createdModelId } }).catch(() => {});
    }
    if (orgAdminUserId) await prisma.user.delete({ where: { id: orgAdminUserId } }).catch(() => {});
    if (candidateUserId) await prisma.user.delete({ where: { id: candidateUserId } }).catch(() => {});
    if (orgId) await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
  }, 30000);

  it("POST /api/v1/ai-models — Organization Admin can register a new AI matching model", async () => {
    const res = await request(app)
      .post("/api/v1/ai-models")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${orgAdminToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        name: `all-MiniLM-L6-v2-test-${Date.now()}`,
        version: "2.1.0",
        algorithm: "ONNX_COSINE_SIMILARITY",
        description: "ONNX Quantized 384-dimensional teacher profile semantic embeddings",
        hyperparameters: {
          dimension: 384,
          maxSeqLength: 256,
          pooling: "mean",
        },
        isActive: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.algorithm).toBe("ONNX_COSINE_SIMILARITY");
    createdModelId = res.body.data.id;
  });

  it("POST /api/v1/ai-models — Candidate is REJECTED with 403 Forbidden", async () => {
    const res = await request(app)
      .post("/api/v1/ai-models")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${candidateToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        name: "Unauthorized-Model",
        version: "1.0.0",
        algorithm: "OPENAI_EMBEDDINGS",
        hyperparameters: { dimension: 1536 },
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Forbidden");
  });

  it("GET /api/v1/ai-models — lists available matching models for Organization Admin", async () => {
    const res = await request(app)
      .get("/api/v1/ai-models")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${orgAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
