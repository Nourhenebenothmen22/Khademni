import { describe, it, expect, vi } from "vitest";
import { requireTenantAccess } from "./tenant.middleware.js";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import type { Response, NextFunction } from "express";

describe("requireTenantAccess Middleware", () => {
  const createMockReqRes = (userOrgId?: string, requestedOrgId?: string) => {
    const req = {
      user: userOrgId ? { userId: "user-123", role: "ADMIN", organizationId: userOrgId } : undefined,
      params: requestedOrgId ? { organizationId: requestedOrgId } : {},
      query: {},
      headers: {},
      originalUrl: "/api/v1/jobs",
      method: "POST",
      ip: "127.0.0.1",
    } as unknown as AuthenticatedRequest;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    return { req, res, next };
  };

  it("should return 401 if user is unauthenticated", () => {
    const { req, res, next } = createMockReqRes();
    requireTenantAccess(req, res, next);

    expect(next).toHaveBeenCalled();
    const mockNext = next as unknown as { mock: { calls: Array<[{ statusCode: number; message: string }]> } };
    const error = mockNext.mock.calls[0]?.[0];
    expect(error?.statusCode).toBe(401);
  });

  it("should allow request when requested organization matches authenticated user organization", () => {
    const { req, res, next } = createMockReqRes("org-111", "org-111");
    requireTenantAccess(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("should return 403 Forbidden when requested organization differs from user organization", () => {
    const { req, res, next } = createMockReqRes("org-111", "org-222");
    requireTenantAccess(req, res, next);

    expect(next).toHaveBeenCalled();
    const mockNext = next as unknown as { mock: { calls: Array<[{ statusCode: number; message: string }]> } };
    const error = mockNext.mock.calls[0]?.[0];
    expect(error?.statusCode).toBe(403);
    expect(error?.message).toContain("Cross-tenant access is strictly prohibited");
  });

  it("should return 403 Forbidden when user has no organizationId but passes a requestedOrgId", () => {
    const req = {
      user: { userId: "candidate-123", role: "CANDIDATE", organizationId: null },
      params: { organizationId: "org-victim" },
      query: {},
      headers: {},
      originalUrl: "/api/v1/organizations/org-victim",
      method: "PATCH",
      ip: "127.0.0.1",
    } as unknown as AuthenticatedRequest;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    requireTenantAccess(req, res, next);

    expect(next).toHaveBeenCalled();
    const mockNext = next as unknown as { mock: { calls: Array<[{ statusCode: number; message: string }]> } };
    const error = mockNext.mock.calls[0]?.[0];
    expect(error?.statusCode).toBe(403);
  });
});
