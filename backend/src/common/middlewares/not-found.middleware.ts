import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error.js";

export const notFoundMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};
