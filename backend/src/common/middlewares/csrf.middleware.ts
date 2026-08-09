import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error.js";
import { env } from "../../config/env.js";

const COOKIE_NAME = "_csrf";
const HEADER_NAME = "x-csrf-token";

/**
 * Generates a cryptographically secure CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Express middleware to issue a CSRF token cookie.
 */
export function issueCsrfToken(req: Request, res: Response): void {
  const token = generateCsrfToken();
  const isProduction = env.NODE_ENV === "production";

  res.cookie(COOKIE_NAME, token, {
    httpOnly: false, // Accessible to frontend JS to read and echo in X-CSRF-Token header
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
  });

  res.status(200).json({
    success: true,
    data: { csrfToken: token },
  });
}

/**
 * Verification middleware for state-changing HTTP requests.
 * Uses Double Submit Cookie pattern:
 * - Requests using `Authorization: Bearer <token>` headers are immune to CSRF in browsers and bypass check.
 * - Cookie-authenticated state-changing requests (POST, PUT, PATCH, DELETE) must provide matching `X-CSRF-Token` header.
 */
export function verifyCsrf(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Requests authenticated via Authorization Bearer header are immune to browser CSRF attacks
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return next();
  }

  const cookieToken = req.cookies ? req.cookies[COOKIE_NAME] : undefined;
  const headerToken = (req.headers[HEADER_NAME] || req.headers[HEADER_NAME.toLowerCase()]) as string | undefined;

  if (!cookieToken || !headerToken) {
    // If no session cookies exist either, allow tokenless public POSTs (e.g. login/register)
    if (!req.cookies || (!req.cookies.access_token && !req.cookies.refresh_token)) {
      return next();
    }
    return next(new AppError("CSRF protection error: Missing CSRF token.", 403));
  }

  const bufCookie = Buffer.from(cookieToken, "utf-8");
  const bufHeader = Buffer.from(headerToken, "utf-8");

  if (
    bufCookie.length === 0 ||
    bufHeader.length === 0 ||
    bufCookie.length !== bufHeader.length ||
    !crypto.timingSafeEqual(bufCookie, bufHeader)
  ) {
    return next(new AppError("CSRF protection error: Invalid CSRF token match.", 403));
  }

  next();
}
