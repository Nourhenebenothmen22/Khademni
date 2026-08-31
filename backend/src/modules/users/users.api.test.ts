import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";

vi.mock("../../lib/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
  sendApplicationStatusEmail: vi.fn().mockResolvedValue(true),
  sendInterviewInviteEmail: vi.fn().mockResolvedValue(true),
  sendInterviewReminderEmail: vi.fn().mockResolvedValue(true),
  sendInterviewInvitationEmail: vi.fn().mockResolvedValue(true),
  sendInterviewRescheduledEmail: vi.fn().mockResolvedValue(true),
  sendInterviewCancelledEmail: vi.fn().mockResolvedValue(true),
  sendTwoFactorTokenEmail: vi.fn().mockResolvedValue(true),
  sendJobAlertEmail: vi.fn().mockResolvedValue(true),
  sendEmailWithRetry: vi.fn().mockResolvedValue({ messageId: "mock-id" }),
}));

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken } from "../../lib/jwt.js";
import { hashPassword } from "../../lib/password.js";

describe("Users & Admin User Directory API Integration Tests", () => {
  let userToken: string;
  let adminToken: string;
  let userId: string;
  let adminUserId: string;
  let orgId: string;
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
        name: `User Test Org ${Date.now()}`,
        slug: `user-test-org-${Date.now()}`,
      },
    });
    orgId = org.id;

    const passwordHash = await hashPassword("UserPass2026!");

    const user = await prisma.user.create({
      data: {
        email: `usr_profile_${Date.now()}@example.com`,
        passwordHash,
        fullName: "Original Profile Name",
        role: "CANDIDATE",
      },
    });
    userId = user.id;

    const admin = await prisma.user.create({
      data: {
        email: `admin_usr_${Date.now()}@example.com`,
        passwordHash,
        fullName: "Directory Admin",
        role: "ORGANIZATION_ADMIN",
        organizationId: orgId,
      },
    });
    adminUserId = admin.id;

    userToken = await signAccessToken({
      userId: user.id,
      role: "CANDIDATE",
    });

    adminToken = await signAccessToken({
      userId: admin.id,
      role: "ORGANIZATION_ADMIN",
      organizationId: orgId,
    });
  }, 60000);

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    if (adminUserId) await prisma.user.delete({ where: { id: adminUserId } }).catch(() => {});
    if (orgId) await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
  }, 60000);

  it("GET /api/v1/users/me — should retrieve candidate profile", async () => {
    const res = await request(app)
      .get("/api/v1/users/me")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe("Original Profile Name");
    expect(res.body.data.passwordHash).toBeUndefined(); // Sensitive data redacted
  });

  it("PATCH /api/v1/users/me — should update full name and profile details", async () => {
    const res = await request(app)
      .patch("/api/v1/users/me")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${userToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        fullName: "Updated Profile Name",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.fullName).toBe("Updated Profile Name");
  });

  it("GET /api/v1/admin/users — should list tenant users for ADMIN", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/v1/admin/stats — should return executive recruitment metrics", async () => {
    const res = await request(app)
      .get("/api/v1/admin/stats")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users).toBeDefined();
    expect(res.body.data.jobs).toBeDefined();
    expect(res.body.data.applications).toBeDefined();
  });
});
