import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middlewares/auth.middleware.js";
import * as authService from "./auth.service.js";
import { env } from "../../config/env.js";
import { COOKIE_CONFIG } from "../../config/constants.js";

export async function getAvailableRolesController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const roles = authService.getAvailableRoles();
    res.status(200).json({
      success: true,
      data: roles,
    });
  } catch (error) {
    next(error);
  }
}

export async function registerController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json({
      success: true,
      data: result.user,
      ...(result.verificationToken
        ? { verificationToken: result.verificationToken }
        : {}),
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmailController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.verifyEmail(req.body);
    res.status(200).json({
      success: true,
      data: { message: result.message },
    });
  } catch (error) {
    next(error);
  }
}

export async function loginController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const result = await authService.loginUser(req.body, ip, userAgent);

    if (result.mfaRequired) {
      res.clearCookie("access_token", { path: "/" });
      res.clearCookie("refresh_token", { path: "/" });
      res.status(200).json({
        success: true,
        data: {
          mfaRequired: true,
          userId: result.userId,
          mfaToken: result.mfaToken,
          message: result.message,
        },
      });
      return;
    }

    if (result.refreshToken) {
      res.cookie("refresh_token", result.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE_MS,
      });
    }

    if (result.accessToken) {
      res.cookie("access_token", result.accessToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE_MS,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function loginMfaController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const result = await authService.loginMfa(req.body, ip, userAgent);

    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE_MS,
    });

    res.cookie("access_token", result.accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE_MS,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken =
      req.body?.refreshToken ||
      (req.cookies ? (req.cookies.refresh_token || req.cookies.refreshToken) : undefined);

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token missing.",
      });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    const result = await authService.refreshSession(
      refreshToken,
      ip,
      userAgent,
    );

    res.cookie("refresh_token", result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_CONFIG.REFRESH_TOKEN_MAX_AGE_MS,
    });

    res.cookie("access_token", result.accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_CONFIG.ACCESS_TOKEN_MAX_AGE_MS,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function logoutController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken =
      req.body?.refreshToken ||
      (req.cookies ? req.cookies.refresh_token : undefined);

    if (refreshToken) {
      await authService.logoutSession(refreshToken);
    }

    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });

    res.status(200).json({
      success: true,
      data: { message: "Logged out successfully." },
    });
  } catch (error) {
    next(error);
  }
}

export async function setupMfaController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await authService.setupMfa(userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyMfaController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await authService.verifyMfa(userId, req.body);
    res.status(200).json({
      success: true,
      data: { message: result.message },
    });
  } catch (error) {
    next(error);
  }
}

export async function requestPasswordResetController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.requestPasswordReset(req.body.email);
    res.status(200).json({ success: true, data: { message: result.message } });
  } catch (error) {
    next(error);
  }
}

export async function resetPasswordController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.resetPassword(req.body.token, req.body.newPassword);
    res.status(200).json({ success: true, data: { message: result.message } });
  } catch (error) {
    next(error);
  }
}
