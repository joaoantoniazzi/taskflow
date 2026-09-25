import { Router } from "express";

import {
  authController,
} from "../controllers/auth.controller.js";

import {
  validateBody,
} from "../middlewares/validate.js";

import {
  requireAuth,
} from "../middlewares/require-auth.js";

import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from "../schemas/auth.schemas.js";

const authRouter = Router();

authRouter.post(
  "/register",
  validateBody(registerSchema),
  authController.register,
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  authController.login,
);

authRouter.post(
  "/refresh",
  validateBody(refreshSchema),
  authController.refresh,
);

authRouter.post(
  "/logout",
  validateBody(logoutSchema),
  authController.logout,
);

authRouter.get(
  "/me",
  requireAuth,
  authController.me,
);

export default authRouter;