import { describe, it, expect, vi, beforeEach } from "vitest";
import { authenticate, requireRole, type AuthenticatedRequest } from "./auth.middleware.js";
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
        role: "ORGANIZATION_ADMIN" as const,
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
        role: "CANDIDATE" as const,
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
        role: "ORGANIZATION_ADMIN" as const,
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
      const middleware = requireRole("ORGANIZATION_ADMIN");
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = getNextError(mockNext);
      expect(error.statusCode).toBe(401);
    });

    it("should allow request if user role matches allowed roles", () => {
      mockReq.user = {
        userId: "user-1",
        role: "ORGANIZATION_ADMIN",
        organizationId: "org-1",
        email: "a@a.com",
        sessionId: "s-1",
      };

      const middleware = requireRole("ORGANIZATION_ADMIN");
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

      const middleware = requireRole("ORGANIZATION_ADMIN");
      middleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = getNextError(mockNext);
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain("Forbidden. Requires one of the following roles: ORGANIZATION_ADMIN");
    });
  });
});
