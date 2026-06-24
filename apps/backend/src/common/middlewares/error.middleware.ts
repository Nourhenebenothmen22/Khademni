import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { env } from '../../config/env.js';

const isDevelopment = env.NODE_ENV === 'development';

interface ZodIssueSummary {
  path: string;
  message: string;
}

export const globalErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ZodError) {
    const errors: ZodIssueSummary[] = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
      ...(isDevelopment ? { stack: err.stack } : {}),
    });
    return;
  }

  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      success: false,
      message: err.message,
    };

    if (err.details !== undefined && isDevelopment) {
      body.errors = err.details;
    }

    if (isDevelopment) {
      body.stack = err.stack;
    }

    res.status(err.statusCode).json(body);
    return;
  }

  const message = err instanceof Error
    ? err.message
    : 'Internal server error';

  const stack = err instanceof Error ? err.stack : undefined;

  res.status(500).json({
    success: false,
    message: isDevelopment ? message : 'Internal server error',
    ...(isDevelopment && stack ? { stack } : {}),
  });
};
