import { describe, it, expect, vi, beforeEach } from "vitest";
import { authenticate, requireRole, requireSuperAdmin, type AuthenticatedRequest } from "./auth.middleware.js";
import type { Response, NextFunction } from "express";
import * as jwtLib from "../../lib/jwt.js";
import { AppError } from "../errors/app-error.js";

describe("Auth & RBAC Middleware Unit Tests", () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {},
    };
    mockRes = {};
    mockNext = vi.fn();
  });

  const getNextError = (fn: NextFunction): AppError => {
    const calls = vi.mocked(fn).mock.calls;
    return (calls[0]?.[0] as unknown as AppError) || new AppError("No error called", 500);
  };

  describe("authenticate", () => {
    it("should throw 401 if neither Authorization header nor access_token cookie is present", async () => {
      await authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = getNextError(mockNext);
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain("Missing access token");
    });

    it("should extract Bearer token and populate req.user on valid token", async () => {
      const mockPayload = {
        userId: "user-123",
        role: "ADMIN",
        organizationId: "org-1",
        email: "admin@example.com",
        sessionId: "sess-1",
      };

      vi.spyOn(jwtLib, "verifyAccessToken").mockResolvedValueOnce(mockPayload);
      mockReq.headers = { authorization: "Bearer valid-jwt-token" };

      await authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should extract token from cookies if Bearer header is omitted", async () => {
      const mockPayload = {
        userId: "user-456",
        role: "CANDIDATE",
        organizationId: null,
        email: "candidate@example.com",
        sessionId: "sess-2",
      };

      vi.spyOn(jwtLib, "verifyAccessToken").mockResolvedValueOnce(mockPayload);
      mockReq.cookies = { access_token: "cookie-jwt-token" };

      await authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should reject token with isMfaPending=true with 401 MFA verification required", async () => {
      const mockPayload = {
        userId: "user-mfa",
        role: "ADMIN",
        organizationId: "org-1",
        email: "mfa@example.com",
        sessionId: "sess-mfa",
        isMfaPending: true,
      };

      vi.spyOn(jwtLib, "verifyAccessToken").mockResolvedValueOnce(mockPayload);
      mockReq.headers = { authorization: "Bearer pending-mfa-token" };

      await authenticate(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = getNextError(mockNext);
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain("MFA verification required");
    });
  });

  describe("requireRole", () => {
    it("should reject unauthenticated request with 401", () => {
      const middleware = requireRole("ADMIN");
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = getNextError(mockNext);
      expect(error.statusCode).toBe(401);
    });

    it("should allow request if user role matches allowed roles", () => {
      mockReq.user = {
        userId: "user-1",
        role: "ADMIN",
        organizationId: "org-1",
        email: "a@a.com",
        sessionId: "s-1",
      };

      const middleware = requireRole("ADMIN", "SUPER_ADMIN" as unknown as "ADMIN");
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should reject with 403 Forbidden if user role is not in allowed roles", () => {
      mockReq.user = {
        userId: "user-1",
        role: "CANDIDATE",
        organizationId: null,
        email: "c@c.com",
        sessionId: "s-1",
      };

      const middleware = requireRole("ADMIN");
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = getNextError(mockNext);
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain("Forbidden. Requires one of the following roles: ADMIN");
    });
  });

  describe("requireSuperAdmin", () => {
    it("should allow ADMIN with no organizationId (Platform Super Admin)", () => {
      mockReq.user = {
        userId: "super-admin-1",
        role: "ADMIN",
        organizationId: null,
        email: "superadmin@platform.com",
        sessionId: "s-sa",
      };

      requireSuperAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should allow ADMIN with isSuperAdmin=true flag", () => {
      mockReq.user = {
        userId: "super-admin-2",
        role: "ADMIN",
        organizationId: "org-1",
        email: "superadmin@platform.com",
        sessionId: "s-sa2",
        isSuperAdmin: true,
      };

      requireSuperAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should reject regular tenant ADMIN with 403", () => {
      mockReq.user = {
        userId: "tenant-admin",
        role: "ADMIN",
        organizationId: "org-tenant-1",
        email: "admin@school.com",
        sessionId: "s-ta",
        isSuperAdmin: false,
      };

      requireSuperAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = getNextError(mockNext);
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain("Super Admin clearance is required");
    });

    it("should reject CANDIDATE with 403", () => {
      mockReq.user = {
        userId: "cand-1",
        role: "CANDIDATE",
        organizationId: null,
        email: "cand@test.com",
        sessionId: "s-c",
      };

      requireSuperAdmin(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = getNextError(mockNext);
      expect(error.statusCode).toBe(403);
    });
  });
});
