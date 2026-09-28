import { Router } from "express";

import healthRouter from "./health.routes.js";
import authRouter from "./auth.routes.js";
import teamRouter from "./team.routes.js";

const router = Router();

router.use(
  "/health",
  healthRouter,
);

router.use(
  "/auth",
  authRouter,
);

router.use(
  "/teams",
  teamRouter,
);

export default router;