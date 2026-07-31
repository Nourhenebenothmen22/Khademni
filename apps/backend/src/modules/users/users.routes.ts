import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware.js";
import { validateBody } from "../../common/middlewares/validate.middleware.js";
import { updateUserSchema } from "../../common/validators/user.validators.js";
import * as usersController from "./users.controller.js";

const router = Router();

router.use(authenticate);

router.get("/me", usersController.getProfileController);
router.patch(
  "/me",
  validateBody(updateUserSchema),
  usersController.updateProfileController,
);

export { router as usersRouter };
