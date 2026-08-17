import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken } from "../../lib/jwt.js";

describe("AI Benchmark Models API Integration Tests", () => {
  let superAdminToken: string;
  let tenantAdminToken: string;
  let superAdminUserId: string;
  let tenantAdminUserId: string;
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

    // Super Admin: organizationId is null or isSuperAdmin flag
    const superAdmin = await prisma.user.create({
      data: {
        email: `superadmin_ai_${Date.now()}@platform.com`,
        passwordHash: "hash",
        fullName: "Platform Super Admin",
        role: "ADMIN",
      },
    });
    superAdminUserId = superAdmin.id;

    // Tenant Admin: associated with organization
    const tenantAdmin = await prisma.user.create({
      data: {
        email: `tenant_admin_ai_${Date.now()}@school.edu`,
        passwordHash: "hash",
        fullName: "Tenant Admin",
        role: "ADMIN",
        organizationId: orgId,
      },
    });
    tenantAdminUserId = tenantAdmin.id;

    superAdminToken = await signAccessToken({
      userId: superAdmin.id,
      role: "ADMIN",
      isSuperAdmin: true,
    });

    tenantAdminToken = await signAccessToken({
      userId: tenantAdmin.id,
      role: "ADMIN",
      organizationId: orgId,
      isSuperAdmin: false,
    });
  }, 30000);

  afterAll(async () => {
    if (createdModelId) {
      await prisma.aIMatchingModelEvaluation.deleteMany({ where: { modelId: createdModelId } }).catch(() => {});
      await prisma.aIMatchingModel.delete({ where: { id: createdModelId } }).catch(() => {});
    }
    if (superAdminUserId) await prisma.user.delete({ where: { id: superAdminUserId } }).catch(() => {});
    if (tenantAdminUserId) await prisma.user.delete({ where: { id: tenantAdminUserId } }).catch(() => {});
    if (orgId) await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
  }, 30000);

  it("POST /api/v1/ai-models — Super Admin can register a new AI matching model", async () => {
    const res = await request(app)
      .post("/api/v1/ai-models")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${superAdminToken}`)
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

  it("POST /api/v1/ai-models — Tenant Admin is REJECTED with 403 Forbidden", async () => {
    const res = await request(app)
      .post("/api/v1/ai-models")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${tenantAdminToken}`)
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
    expect(res.body.message).toContain("Super Admin clearance is required");
  });

  it("GET /api/v1/ai-models — lists available matching models", async () => {
    const res = await request(app)
      .get("/api/v1/ai-models")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
