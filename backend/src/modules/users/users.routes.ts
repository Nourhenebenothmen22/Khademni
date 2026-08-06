import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware.js";
import { validateBody } from "../../common/middlewares/validate.middleware.js";
import { updateUserSchema, changePasswordSchema } from "../../common/validators/user.validators.js";
import * as usersController from "./users.controller.js";

const router = Router();

router.use(authenticate);

router.get("/me", usersController.getProfileController);
router.patch(
  "/me",
  validateBody(updateUserSchema),
  usersController.updateProfileController,
);
router.post(
  "/me/change-password",
  validateBody(changePasswordSchema),
  usersController.changePasswordController,
);

export { router as usersRouter };

