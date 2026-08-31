import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware.js";
import { validateBody } from "../../common/middlewares/validate.middleware.js";
import { avatarUpload, validateAndSaveAvatarUpload } from "../../common/middlewares/avatar-upload.middleware.js";
import { updateUserSchema, changePasswordSchema } from "../../common/validators/user.validators.js";
import * as usersController from "./users.controller.js";

const router = Router();

// Public avatar streaming route for <img> tags
router.get("/:id/avatar", usersController.getAvatarController);

// Authenticated user profile routes
router.use(authenticate);

router.get("/me", usersController.getProfileController);
router.patch(
  "/me",
  validateBody(updateUserSchema),
  usersController.updateProfileController,
);
router.post(
  "/me/avatar",
  avatarUpload.single("file"),
  validateAndSaveAvatarUpload,
  usersController.uploadAvatarController,
);
router.delete("/me/avatar", usersController.deleteAvatarController);
router.post(
  "/me/change-password",
  validateBody(changePasswordSchema),
  usersController.changePasswordController,
);

export { router as usersRouter };
