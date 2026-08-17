import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken } from "../../lib/jwt.js";

describe("Organizations API Integration Tests", () => {
  let org1Id: string;
  let org2Id: string;
  let admin1Token: string;
  let admin2Token: string;
  let admin1UserId: string;
  let admin2UserId: string;
  let csrfToken: string;
  let csrfCookie: string;

  beforeAll(async () => {
    const csrfRes = await request(app)
      .get("/api/v1/auth/csrf")
      .set("Origin", "http://localhost:3001");
    csrfToken = csrfRes.body.data.csrfToken;
    const cookies = csrfRes.headers["set-cookie"] as unknown as string[];
    csrfCookie = Array.isArray(cookies) ? cookies.join("; ") : cookies;

    const org1 = await prisma.organization.create({
      data: {
        name: `Acme Academy 1 ${Date.now()}`,
        slug: `acme-1-${Date.now()}`,
      },
    });
    org1Id = org1.id;

    const org2 = await prisma.organization.create({
      data: {
        name: `Beacon High 2 ${Date.now()}`,
        slug: `beacon-2-${Date.now()}`,
      },
    });
    org2Id = org2.id;

    const admin1 = await prisma.user.create({
      data: {
        email: `admin1_${Date.now()}@acme.edu`,
        passwordHash: "hash",
        fullName: "Admin One",
        role: "ADMIN",
        organizationId: org1Id,
      },
    });
    admin1UserId = admin1.id;

    const admin2 = await prisma.user.create({
      data: {
        email: `admin2_${Date.now()}@beacon.edu`,
        passwordHash: "hash",
        fullName: "Admin Two",
        role: "ADMIN",
        organizationId: org2Id,
      },
    });
    admin2UserId = admin2.id;

    admin1Token = await signAccessToken({
      userId: admin1UserId,
      role: "ADMIN",
      organizationId: org1Id,
    });

    admin2Token = await signAccessToken({
      userId: admin2UserId,
      role: "ADMIN",
      organizationId: org2Id,
    });
  });

  afterAll(async () => {
    if (admin1UserId) await prisma.user.delete({ where: { id: admin1UserId } }).catch(() => {});
    if (admin2UserId) await prisma.user.delete({ where: { id: admin2UserId } }).catch(() => {});
    if (org1Id) await prisma.organization.delete({ where: { id: org1Id } }).catch(() => {});
    if (org2Id) await prisma.organization.delete({ where: { id: org2Id } }).catch(() => {});
  });

  it("GET /api/v1/organizations/me — should return authenticated user's organization profile", async () => {
    const res = await request(app)
      .get("/api/v1/organizations/me")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${admin1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(org1Id);
    expect(res.body.data.name).toContain("Acme Academy 1");
  });

  it("GET /api/v1/organizations/:id — should allow access to own organization", async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${org1Id}`)
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${admin1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(org1Id);
  });

  it("GET /api/v1/organizations/:id — should REJECT cross-tenant access with 403 Forbidden", async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${org2Id}`)
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${admin1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Cross-tenant access is strictly prohibited");
  });

  it("PATCH /api/v1/organizations/:id — should allow tenant admin to update organization metadata", async () => {
    const res = await request(app)
      .patch(`/api/v1/organizations/${org1Id}`)
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${admin1Token}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        name: "Acme International Academy",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Acme International Academy");
  });

  it("GET /api/v1/organizations/:id — should allow Admin 2 to access Org 2 and deny access to Org 1", async () => {
    const resOrg2 = await request(app)
      .get(`/api/v1/organizations/${org2Id}`)
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${admin2Token}`);

    expect(resOrg2.status).toBe(200);
    expect(resOrg2.body.success).toBe(true);
    expect(resOrg2.body.data.id).toBe(org2Id);

    const resOrg1 = await request(app)
      .get(`/api/v1/organizations/${org1Id}`)
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${admin2Token}`);

    expect(resOrg1.status).toBe(403);
    expect(resOrg1.body.success).toBe(false);
  });
});
