import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodType } from "zod";

export const validateBody = <T extends ZodType>(schema: T): RequestHandler => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await schema.safeParseAsync(req.body);
      if (!result.success) {
        return next(result.error);
      }
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateQuery = <T extends ZodType>(schema: T): RequestHandler => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await schema.safeParseAsync(req.query);
      if (!result.success) {
        return next(result.error);
      }
      // In Express 5, req.query is a getter. Mutate properties in-place.
      Object.keys(req.query).forEach((key) => delete (req.query as Record<string, unknown>)[key]);
      Object.assign(req.query, result.data);
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateParams = <T extends ZodType>(
  schema: T,
): RequestHandler => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await schema.safeParseAsync(req.params);
      if (!result.success) {
        return next(result.error);
      }
      // In Express 5, req.params is a getter. Mutate properties in-place.
      Object.assign(req.params, result.data);
      next();
    } catch (error) {
      next(error);
    }
  };
};
