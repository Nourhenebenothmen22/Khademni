import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";

vi.mock("../../lib/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
  sendApplicationStatusEmail: vi.fn().mockResolvedValue(true),
  sendInterviewInviteEmail: vi.fn().mockResolvedValue(true),
  sendInterviewReminderEmail: vi.fn().mockResolvedValue(true),
  sendTwoFactorTokenEmail: vi.fn().mockResolvedValue(true),
  sendJobAlertEmail: vi.fn().mockResolvedValue(true),
  sendEmailWithRetry: vi.fn().mockResolvedValue({ messageId: "mock-id" }),
}));

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";

describe("Auth API Integration Test Suite", () => {
  const testEmail = `authtest_${Date.now()}@example.com`;
  const testPassword = "StrongPassword2026!";
  let csrfToken: string;
  let csrfCookie: string;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    const csrfRes = await request(app)
      .get("/api/v1/auth/csrf")
      .set("Origin", "http://localhost:3001");

    expect(csrfRes.status).toBe(200);
    csrfToken = csrfRes.body.data.csrfToken;
    const cookies = csrfRes.headers["set-cookie"] as unknown as string[];
    csrfCookie = Array.isArray(cookies) ? cookies.join("; ") : cookies;
  }, 30000);

  afterAll(async () => {
    if (userId) {
      await prisma.authSession.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  }, 30000);

  it("POST /api/v1/auth/register — should register a new candidate account", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3001")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        email: testEmail,
        password: testPassword,
        fullName: "Automated Auth Tester",
        role: "CANDIDATE",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testEmail);
    expect(res.body.data.role).toBe("CANDIDATE");
    userId = res.body.data.id;
  }, 30000);

  it("POST /api/v1/auth/register — should reject duplicate email with 409 Conflict", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3001")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        email: testEmail,
        password: testPassword,
        fullName: "Duplicate User",
        role: "CANDIDATE",
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  }, 30000);

  it("POST /api/v1/auth/login — should reject invalid password with 401", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3001")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        email: testEmail,
        password: "IncorrectPassword123!",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  }, 30000);

  it("POST /api/v1/auth/login — should authenticate with valid credentials and return tokens", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3001")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  }, 30000);

  it("POST /api/v1/auth/refresh — should rotate refresh token and return new access token", async () => {
    expect(refreshToken).toBeDefined();
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Origin", "http://localhost:3001")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        refreshToken,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    accessToken = res.body.data.accessToken;
  }, 30000);

  it("POST /api/v1/auth/logout — should revoke refresh session and clear cookies", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        refreshToken,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  }, 30000);

  it("GET /api/v1/auth/roles — should return exactly two available registration roles", async () => {
    const res = await request(app)
      .get("/api/v1/auth/roles")
      .set("Origin", "http://localhost:3001");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);

    const roleNames = res.body.data.map((r: { role: string }) => r.role);
    expect(roleNames).toContain("CANDIDATE");
    expect(roleNames).toContain("ORGANIZATION_ADMIN");
  }, 30000);

  let orgAdminUserId: string;
  let orgId: string;

  it("POST /api/v1/auth/register — should register an ORGANIZATION_ADMIN and auto-create Organization workspace", async () => {
    const adminEmail = `orgadmin_${Date.now()}@acmeacademy.org`;
    const orgName = `Acme Academy ${Date.now()}`;

    const res = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3001")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        fullName: "Principal Skinner",
        email: adminEmail,
        password: testPassword,
        role: "ORGANIZATION_ADMIN",
        organizationName: orgName,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe("ORGANIZATION_ADMIN");
    expect(res.body.data.organizationId).toBeDefined();

    orgAdminUserId = res.body.data.id;
    orgId = res.body.data.organizationId;

    // Login as org admin to get valid token
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3001")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        email: adminEmail,
        password: testPassword,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe("ORGANIZATION_ADMIN");
    expect(loginRes.body.data.user.organizationId).toBe(orgId);
    orgAdminAccessToken = loginRes.body.data.accessToken;
  }, 30000);

  it("RBAC Security — Candidate accessing Organization Admin endpoints should return 403 Forbidden", async () => {
    // 1. Candidate login
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3001")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        email: testEmail,
        password: testPassword,
      });

    const candidateToken = loginRes.body.data.accessToken;

    // 2. Candidate attempting to access /api/v1/admin/stats
    const adminRes = await request(app)
      .get("/api/v1/admin/stats")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${candidateToken}`);

    expect(adminRes.status).toBe(403);
  }, 30000);

  it("RBAC Security — User attempting to modify their own role via PATCH /users/me should be rejected or ignored", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3001")
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        email: testEmail,
        password: testPassword,
      });

    const candidateToken = loginRes.body.data.accessToken;

    // Attempt to escalate role via profile update
    const patchRes = await request(app)
      .patch("/api/v1/users/me")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${candidateToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        fullName: "Hacked Candidate",
        role: "ORGANIZATION_ADMIN",
      });

    // Zod strict schema rejects unknown keys with 400 or does not alter role
    if (patchRes.status === 200) {
      expect(patchRes.body.data.role).toBe("CANDIDATE");
    } else {
      expect(patchRes.status).toBe(400);
    }
  }, 30000);

  afterAll(async () => {
    if (orgAdminUserId) {
      await prisma.authSession.deleteMany({ where: { userId: orgAdminUserId } }).catch(() => {});
      await prisma.user.delete({ where: { id: orgAdminUserId } }).catch(() => {});
    }
    if (orgId) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
    }
  });
});
