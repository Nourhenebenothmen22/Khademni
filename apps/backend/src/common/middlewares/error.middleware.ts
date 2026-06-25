import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

const isDevelopment = env.NODE_ENV === 'development';

interface ZodIssueSummary {
  path: string;
  message: string;
}

function isPrismaKnownRequestError(
  err: unknown,
): err is { code: string; meta?: Record<string, unknown>; message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'clientVersion' in err
  );
}

function isJoseError(err: unknown): err is Error {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as Record<string, unknown>).code === 'string' &&
    (
      (err as Record<string, unknown>).code === 'ERR_JWT_EXPIRED' ||
      (err as Record<string, unknown>).code === 'ERR_JWS_INVALID' ||
      (err as Record<string, unknown>).code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' ||
      (err as Record<string, unknown>).code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED'
    )
  );
}

function isMulterError(
  err: unknown,
): err is { code: string; field?: string; message: string } {
  return (
    (typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as Record<string, unknown>).storageErrors !== undefined) ||
    (typeof err === 'object' &&
      err !== null &&
      err.constructor?.name === 'MulterError')
  );
}


export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ZodError) {
    const errors: ZodIssueSummary[] = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    logger.warn({ errors, url: req.originalUrl }, 'Validation error');

    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
      ...(isDevelopment ? { stack: err.stack } : {}),
    });
    return;
  }

  if (err instanceof AppError) {
    logger.warn(
      { statusCode: err.statusCode, url: req.originalUrl },
      err.message,
    );

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

  if (isPrismaKnownRequestError(err)) {
    const prismaCode = err.code;
    let statusCode = 500;
    let message = 'Database error';

    switch (prismaCode) {
      case 'P2002':
        statusCode = 409;
        message = 'A record with this value already exists.';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Related record not found.';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found.';
        break;
      default:
        statusCode = 500;
        message = 'Internal database error.';
    }

    logger.error(
      { prismaCode, url: req.originalUrl },
      `Prisma error: ${prismaCode}`,
    );

    res.status(statusCode).json({
      success: false,
      message,
      ...(isDevelopment ? { code: prismaCode, stack: err instanceof Error ? err.stack : undefined } : {}),
    });
    return;
  }

  if (isJoseError(err)) {
    logger.warn({ url: req.originalUrl }, 'JWT authentication error');

    res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
    return;
  }

  if (isMulterError(err)) {
    logger.warn(
      { code: (err as Record<string, unknown>).code, url: req.originalUrl },
      'File upload error',
    );

    res.status(400).json({
      success: false,
      message: err.message || 'File upload error.',
      ...(isDevelopment
        ? { code: (err as Record<string, unknown>).code }
        : {}),
    });
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Internal server error';
  const stack = err instanceof Error ? err.stack : undefined;

  logger.error({ err, url: req.originalUrl }, 'Unhandled error');

  res.status(500).json({
    success: false,
    message: isDevelopment ? message : 'Internal server error',
    ...(isDevelopment && stack ? { stack } : {}),
  });
};
