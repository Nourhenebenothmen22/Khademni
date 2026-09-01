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
import { signAccessToken } from "../../lib/jwt.js";

describe("Applications API Integration Tests", () => {
  let adminToken: string;
  let candidateToken: string;
  let orgId: string;
  let adminUserId: string;
  let candidateUserId: string;
  let jobId: string;
  let applicationId: string;
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
        name: `App Org ${Date.now()}`,
        slug: `app-org-${Date.now()}`,
      },
    });
    orgId = org.id;

    const admin = await prisma.user.create({
      data: {
        email: `admin_app_${Date.now()}@example.com`,
        passwordHash: "hash",
        fullName: "App Admin",
        role: "ORGANIZATION_ADMIN",
        organizationId: orgId,
      },
    });
    adminUserId = admin.id;

    const candidate = await prisma.user.create({
      data: {
        email: `cand_app_${Date.now()}@example.com`,
        passwordHash: "hash",
        fullName: "App Candidate",
        role: "CANDIDATE",
      },
    });
    candidateUserId = candidate.id;

    const job = await prisma.jobPost.create({
      data: {
        title: "Biology Teacher",
        description: "AP Biology instructor for secondary school students.",
        requirements: "Bachelor or Master Degree in Biology.",
        organizationId: orgId,
        createdById: adminUserId,
        status: "PUBLISHED",
      },
    });
    jobId = job.id;

    const application = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobPostId: job.id,
        status: "SUBMITTED",
        trackingCode: `TRK-APP-${Date.now()}`,
      },
    });
    applicationId = application.id;

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
    if (applicationId) {
      await prisma.applicationStatusHistory.deleteMany({ where: { applicationId } }).catch(() => {});
      await prisma.application.delete({ where: { id: applicationId } }).catch(() => {});
    }
    if (jobId) await prisma.jobPost.delete({ where: { id: jobId } }).catch(() => {});
    if (adminUserId) await prisma.user.delete({ where: { id: adminUserId } }).catch(() => {});
    if (candidateUserId) await prisma.user.delete({ where: { id: candidateUserId } }).catch(() => {});
    if (orgId) await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
  }, 45000);

  it("GET /api/v1/applications — should return paginated list for ORGANIZATION_ADMIN", async () => {
    const res = await request(app)
      .get("/api/v1/applications")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  }, 30000);

  it("GET /api/v1/applications/me — should return candidate's submitted applications", async () => {
    const res = await request(app)
      .get("/api/v1/applications/me")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${candidateToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].id).toBe(applicationId);
  }, 30000);

  it("PATCH /api/v1/applications/:id/status — should update application status through valid transition", async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${applicationId}/status`)
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        status: "UNDER_REVIEW",
        reason: "Initial screening of candidate profile.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("UNDER_REVIEW");
  }, 30000);

  it("POST /api/v1/applications/:id/withdraw — candidate can withdraw application", async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${applicationId}/withdraw`)
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${candidateToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("WITHDRAWN");
  }, 30000);
});
