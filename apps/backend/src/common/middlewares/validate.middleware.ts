import type { Request, Response, NextFunction } from 'express';
import type { ZodType, z } from 'zod';
import type { ParamsDictionary } from 'express-serve-static-core';

export const validateBody = <T extends ZodType>(schema: T) => {
  return async (
    req: Request<ParamsDictionary, unknown, z.infer<T>>,
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

export const validateQuery = <T extends ZodType>(schema: T) => {
  return async (
    req: Request<ParamsDictionary, unknown, unknown, z.infer<T>>,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await schema.safeParseAsync(req.query);
      if (!result.success) {
        return next(result.error);
      }
      req.query = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateParams = <T extends ZodType>(schema: T) => {
  return async (
    req: Request<z.infer<T>, unknown, unknown, unknown>,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await schema.safeParseAsync(req.params);
      if (!result.success) {
        return next(result.error);
      }
      req.params = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};


