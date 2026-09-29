import { Router } from "express";

import healthRouter from "./health.routes.js";
import authRouter from "./auth.routes.js";
import teamRouter from "./team.routes.js";
import projectRouter from "./project.routes.js";

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

router.use(
  "/projects",
  projectRouter,
);

export default router;