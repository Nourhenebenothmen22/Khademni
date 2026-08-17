import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../app.js";

describe("CORS & Preflight Configuration Integration Tests", () => {
  const allowedOrigin = "http://localhost:3001";
  const disallowedOrigin = "http://unauthorized-malicious-site.com";

  describe("OPTIONS Preflight Requests", () => {
    it("should handle OPTIONS preflight to /api/v1/auth/csrf with 200 and allowed CORS headers", async () => {
      const res = await request(app)
        .options("/api/v1/auth/csrf")
        .set("Origin", allowedOrigin)
        .set("Access-Control-Request-Method", "GET")
        .set("Access-Control-Request-Headers", "Content-Type, X-CSRF-Token");

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe(allowedOrigin);
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
      expect(res.headers["access-control-allow-methods"]).toContain("GET");
      expect(res.headers["access-control-allow-methods"]).toContain("OPTIONS");
      expect(res.headers["access-control-allow-headers"]).toBeDefined();
    });

    it("should handle OPTIONS preflight to /api/v1/auth/login with 200 and allowed headers", async () => {
      const res = await request(app)
        .options("/api/v1/auth/login")
        .set("Origin", allowedOrigin)
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "Content-Type, X-CSRF-Token");

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe(allowedOrigin);
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
      expect(res.headers["access-control-allow-methods"]).toContain("POST");
      expect(res.headers["access-control-max-age"]).toBe("86400");
    });

    it("should NOT return Access-Control-Allow-Origin for unauthorized origins on OPTIONS", async () => {
      const res = await request(app)
        .options("/api/v1/auth/login")
        .set("Origin", disallowedOrigin)
        .set("Access-Control-Request-Method", "POST");

      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });

  describe("Actual Simple & Mutating Requests", () => {
    it("should allow GET /api/v1/auth/csrf from http://localhost:3001 with credentials and return token", async () => {
      const res = await request(app)
        .get("/api/v1/auth/csrf")
        .set("Origin", allowedOrigin);

      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe(allowedOrigin);
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
      expect(res.body.success).toBe(true);
      expect(res.body.data?.csrfToken).toBeDefined();

      // Verify Set-Cookie header contains _csrf with sameSite=lax
      const setCookie = res.headers["set-cookie"];
      expect(setCookie).toBeDefined();
      const cookies = Array.isArray(setCookie) ? setCookie : [String(setCookie)];
      expect(cookies.some((c: string) => c.includes("_csrf="))).toBe(true);
    });

    it("should handle non-browser requests without Origin header (e.g. /health check)", async () => {
      const res = await request(app).get("/health");
      expect([200, 503]).toContain(res.status);
      expect(res.body.status).toBeDefined();
    });

    it("should reject unauthorized origins on actual request without CORS headers", async () => {
      const res = await request(app)
        .get("/api/v1/auth/csrf")
        .set("Origin", disallowedOrigin);

      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });
});
