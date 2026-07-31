import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type TokenPayload } from "../../lib/jwt.js";
import { AppError } from "../errors/app-error.js";
import type { UserRole } from "../../generated/prisma/client.js";

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else if (req.cookies && typeof req.cookies.access_token === "string") {
      token = req.cookies.access_token;
    }

    if (!token) {
      throw new AppError("Authentication required. Missing access token.", 401);
    }

    const payload = await verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError("Invalid or expired access token.", 401));
    }
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      return next(new AppError("Authentication required.", 401));
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return next(
        new AppError(
          `Forbidden. Requires one of the following roles: ${allowedRoles.join(", ")}`,
          403,
        ),
      );
    }

    next();
  };
};
