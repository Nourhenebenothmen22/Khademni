import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken } from "../../lib/jwt.js";

describe("Notifications API Integration Tests", () => {
  let userToken: string;
  let userId: string;
  let notificationId: string;
  let csrfToken: string;
  let csrfCookie: string;

  beforeAll(async () => {
    const csrfRes = await request(app)
      .get("/api/v1/auth/csrf")
      .set("Origin", "http://localhost:3001");
    csrfToken = csrfRes.body.data.csrfToken;
    const cookies = csrfRes.headers["set-cookie"] as unknown as string[];
    csrfCookie = Array.isArray(cookies) ? cookies.join("; ") : cookies;

    const user = await prisma.user.create({
      data: {
        email: `notif_user_${Date.now()}@example.com`,
        passwordHash: "hash",
        fullName: "Notif Tester",
        role: "CANDIDATE",
      },
    });
    userId = user.id;

    userToken = await signAccessToken({
      userId: user.id,
      role: "CANDIDATE",
    });

    const notif = await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Application Shortlisted",
        message: "Your application for Science Teacher has been shortlisted.",
        type: "APPLICATION_STATUS",
        isRead: false,
      },
    });
    notificationId = notif.id;
  }, 30000);

  afterAll(async () => {
    if (userId) {
      await prisma.notification.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
  }, 30000);

  it("GET /api/v1/notifications/unread-count — should return unread notification count", async () => {
    const res = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/v1/notifications — should list in-app notifications", async () => {
    const res = await request(app)
      .get("/api/v1/notifications")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].title).toBe("Application Shortlisted");
  });

  it("PATCH /api/v1/notifications/:id/read — should mark single notification as read", async () => {
    const res = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${userToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isRead).toBe(true);
  });

  it("PATCH /api/v1/notifications/read-all — should mark all notifications as read", async () => {
    const res = await request(app)
      .patch("/api/v1/notifications/read-all")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${userToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
