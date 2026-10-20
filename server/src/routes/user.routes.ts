import { Router } from "express";

import { userController } from "../controllers/user.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { validateBody } from "../middlewares/validate.js";
import { updateProfileSchema } from "../schemas/user.schemas.js";

const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get("/me", userController.getMe);

userRouter.patch(
  "/me",
  validateBody(updateProfileSchema),
  userController.updateMe,
);

export default userRouter;
