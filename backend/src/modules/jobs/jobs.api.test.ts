import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken } from "../../lib/jwt.js";

describe("Jobs & Matching Rules API Integration Tests", () => {
  let adminToken: string;
  let candidateToken: string;
  let orgId: string;
  let adminUserId: string;
  let candidateUserId: string;
  let createdJobId: string;
  let createdKeywordId: string;
  let createdRuleId: string;
  let csrfToken: string;
  let csrfCookie: string;

  beforeAll(async () => {
    // 1. Fetch CSRF token & cookie
    const csrfRes = await request(app)
      .get("/api/v1/auth/csrf")
      .set("Origin", "http://localhost:3001");
    csrfToken = csrfRes.body.data.csrfToken;
    const cookies = csrfRes.headers["set-cookie"] as unknown as string[];
    csrfCookie = Array.isArray(cookies) ? cookies.join("; ") : cookies;

    // 2. Create test organization
    const org = await prisma.organization.create({
      data: {
        name: `Jobs Test Org ${Date.now()}`,
        slug: `jobs-test-org-${Date.now()}`,
        description: "A leading higher education institution.",
        location: "Tunis, Tunisia",
      },
    });
    orgId = org.id;

    // 3. Create admin & candidate users
    const admin = await prisma.user.create({
      data: {
        email: `admin_jobs_${Date.now()}@example.com`,
        passwordHash: "argon2-hash-placeholder",
        fullName: "Jobs Admin Tester",
        role: "ORGANIZATION_ADMIN",
        organizationId: orgId,
      },
    });
    adminUserId = admin.id;

    const candidate = await prisma.user.create({
      data: {
        email: `cand_jobs_${Date.now()}@example.com`,
        passwordHash: "argon2-hash-placeholder",
        fullName: "Candidate Jobs Tester",
        role: "CANDIDATE",
      },
    });
    candidateUserId = candidate.id;

    adminToken = await signAccessToken({
      userId: adminUserId,
      role: "ORGANIZATION_ADMIN",
      organizationId: orgId,
    });

    candidateToken = await signAccessToken({
      userId: candidateUserId,
      role: "CANDIDATE",
    });
  }, 45000);

  afterAll(async () => {
    if (createdJobId) {
      await prisma.jobKeyword.deleteMany({ where: { jobPostId: createdJobId } }).catch(() => {});
      await prisma.jobMatchingRule.deleteMany({ where: { jobPostId: createdJobId } }).catch(() => {});
      await prisma.jobPost.delete({ where: { id: createdJobId } }).catch(() => {});
    }
    if (adminUserId) await prisma.user.delete({ where: { id: adminUserId } }).catch(() => {});
    if (candidateUserId) await prisma.user.delete({ where: { id: candidateUserId } }).catch(() => {});
    if (orgId) await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
  }, 45000);

  it("POST /api/v1/jobs — should allow ADMIN to create a job opening", async () => {
    const res = await request(app)
      .post("/api/v1/jobs")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        title: "Senior High School Mathematics Teacher",
        description: "Looking for an experienced educator in AP Calculus and Linear Algebra for advanced high school students.",
        requirements: "Master's Degree in Mathematics or Education, with at least 3+ years teaching experience.",
        status: "PUBLISHED",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.title).toBe("Senior High School Mathematics Teacher");
    createdJobId = res.body.data.id;
  }, 30000);

  it("GET /api/v1/jobs — should list jobs for ADMIN scoped to organization", async () => {
    expect(createdJobId).toBeDefined();
    const res = await request(app)
      .get("/api/v1/jobs?page=1&limit=10")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const found = res.body.data.find((j: { id: string }) => j.id === createdJobId);
    expect(found).toBeDefined();
    expect(found.title).toBe("Senior High School Mathematics Teacher");
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(10);
  }, 30000);

  it("GET /api/v1/jobs — should list published jobs for public/candidate", async () => {
    expect(createdJobId).toBeDefined();
    const res = await request(app)
      .get("/api/v1/jobs?page=1&limit=10")
      .set("Origin", "http://localhost:3001");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((j: { id: string }) => j.id === createdJobId);
    expect(found).toBeDefined();
  }, 30000);

  it("GET /api/v1/admin/stats — should accurately reflect the created job post in statistics", async () => {
    expect(createdJobId).toBeDefined();
    const res = await request(app)
      .get("/api/v1/admin/stats")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalJobPosts).toBeGreaterThanOrEqual(1);
    expect(res.body.data.jobs).toBeDefined();
    const publishedStat = res.body.data.jobs.find((j: { status: string }) => j.status === "PUBLISHED");
    expect(publishedStat).toBeDefined();
    expect(publishedStat.count).toBeGreaterThanOrEqual(1);
  }, 30000);

  it("POST /api/v1/jobs — should reject CANDIDATE attempt with 403 Forbidden", async () => {
    const res = await request(app)
      .post("/api/v1/jobs")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${candidateToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        title: "Unauthorized Job Creation",
        description: "Invalid candidate post description that exceeds minimum characters required.",
        requirements: "Requirements that meet the minimum characters required.",
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  }, 30000);

  it("GET /api/v1/jobs/:id — should retrieve job details", async () => {
    expect(createdJobId).toBeDefined();
    const res = await request(app)
      .get(`/api/v1/jobs/${createdJobId}`)
      .set("Origin", "http://localhost:3001");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(createdJobId);
  }, 30000);

  it("POST /api/v1/jobs/:jobPostId/keywords — should add keywords to job", async () => {
    expect(createdJobId).toBeDefined();
    const res = await request(app)
      .post(`/api/v1/jobs/${createdJobId}/keywords`)
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        keywords: [
          { keyword: "Calculus", type: "REQUIRED", weight: 1.5 },
          { keyword: "Pedagogy", type: "OPTIONAL", weight: 1.0 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    createdKeywordId = res.body.data[0].id;
  }, 30000);

  it("POST /api/v1/jobs/:jobPostId/rules — should add structured matching rule", async () => {
    expect(createdJobId).toBeDefined();
    const res = await request(app)
      .post(`/api/v1/jobs/${createdJobId}/rules`)
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        ruleName: "Master's Degree Requirement",
        type: "DEGREE",
        condition: { degree: "Master", rank: 2 },
        weight: 1.2,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    createdRuleId = res.body.data.id;
  }, 30000);

  it("DELETE /api/v1/jobs/:jobPostId/keywords/:id — should remove keyword", async () => {
    expect(createdJobId).toBeDefined();
    expect(createdKeywordId).toBeDefined();
    const res = await request(app)
      .delete(`/api/v1/jobs/${createdJobId}/keywords/${createdKeywordId}`)
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  }, 30000);

  it("DELETE /api/v1/jobs/:jobPostId/rules/:id — should remove matching rule", async () => {
    expect(createdJobId).toBeDefined();
    expect(createdRuleId).toBeDefined();
    const res = await request(app)
      .delete(`/api/v1/jobs/${createdJobId}/rules/${createdRuleId}`)
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  }, 30000);
});
