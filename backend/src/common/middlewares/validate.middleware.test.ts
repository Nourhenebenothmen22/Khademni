import { describe, it, expect, vi } from "vitest";
import { z, ZodError } from "zod";
import { validateBody, validateQuery, validateParams } from "./validate.middleware.js";
import type { Request, Response, NextFunction } from "express";

describe("Validation Middleware Unit Tests", () => {
  describe("validateBody", () => {
    const testSchema = z.object({
      email: z.string().email(),
      age: z.number().min(18),
    });

    it("should pass parsed and coerced body to next() when valid", async () => {
      const req = {
        body: { email: "user@example.com", age: 25 },
      } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const handler = validateBody(testSchema);
      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.body).toEqual({ email: "user@example.com", age: 25 });
    });

    it("should forward ZodError to next() when validation fails", async () => {
      const req = {
        body: { email: "not-an-email", age: 15 },
      } as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const handler = validateBody(testSchema);
      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ZodError));
      const calls = vi.mocked(next).mock.calls;
      const error = calls[0]?.[0] as unknown as ZodError;
      expect(error.issues.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("validateQuery", () => {
    const querySchema = z.object({
      page: z.coerce.number().min(1).default(1),
      search: z.string().optional(),
    });

    it("should coerce query parameters and apply defaults", async () => {
      const req = {
        query: { page: "3", search: "mathematics" },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const handler = validateQuery(querySchema);
      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.query.page).toBe(3);
      expect(req.query.search).toBe("mathematics");
    });
  });

  describe("validateParams", () => {
    const paramSchema = z.object({
      id: z.string().min(5),
    });

    it("should validate and mutate req.params in place", async () => {
      const req = {
        params: { id: "valid-id-123" },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const handler = validateParams(paramSchema);
      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.params.id).toBe("valid-id-123");
    });

    it("should forward ZodError when param validation fails", async () => {
      const req = {
        params: { id: "ab" },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      const handler = validateParams(paramSchema);
      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ZodError));
    });
  });
});
