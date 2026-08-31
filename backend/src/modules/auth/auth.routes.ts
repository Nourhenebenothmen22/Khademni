import { Router } from "express";
import { validateBody } from "../../common/middlewares/validate.middleware.js";
import { authenticate } from "../../common/middlewares/auth.middleware.js";
import { issueCsrfToken } from "../../common/middlewares/csrf.middleware.js";
import {
  authLoginRateLimiter,
  authRegisterRateLimiter,
  authRefreshRateLimiter,
  authMfaRateLimiter,
  authRateLimiter,
} from "../../common/middlewares/rate-limit.middleware.js";
import {
  loginSchema,
  mfaLoginSchema,
  verifyEmailSchema,
  mfaVerifySchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
} from "../../common/validators/auth.validators.js";
import { registerUserSchema } from "../../common/validators/user.validators.js";
import * as authController from "./auth.controller.js";

const router = Router();

router.get("/csrf", issueCsrfToken);
router.get("/roles", authController.getAvailableRolesController);

router.post(
  "/register",
  authRegisterRateLimiter,
  validateBody(registerUserSchema),
  authController.registerController,
);

router.post(
  "/verify-email",
  validateBody(verifyEmailSchema),
  authController.verifyEmailController,
);

router.post(
  "/login",
  authLoginRateLimiter,
  validateBody(loginSchema),
  authController.loginController,
);

router.post(
  "/mfa/login",
  authMfaRateLimiter,
  validateBody(mfaLoginSchema),
  authController.loginMfaController,
);

router.post(
  "/refresh",
  authRefreshRateLimiter,
  authController.refreshController,
);

router.post("/logout", authController.logoutController);

router.post("/mfa/setup", authenticate, authController.setupMfaController);

router.post(
  "/mfa/verify",
  authenticate,
  authMfaRateLimiter,
  validateBody(mfaVerifySchema),
  authController.verifyMfaController,
);

router.post(
  "/forgot-password",
  authRateLimiter,
  validateBody(resetPasswordRequestSchema),
  authController.requestPasswordResetController,
);

router.post(
  "/reset-password",
  authRateLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPasswordController,
);

export { router as authRouter };
