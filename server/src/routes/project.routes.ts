import { Router } from "express";

import {
  projectController,
} from "../controllers/project.controller.js";

import {
  requireAuth,
} from "../middlewares/require-auth.js";

import {
  requireProjectRole,
} from "../middlewares/require-project-role.js";

import {
  validateBody,
  validateParams,
} from "../middlewares/validate.js";

import {
  projectIdParamsSchema,
  updateProjectSchema,
} from "../schemas/project.schemas.js";

const projectRouter = Router();

projectRouter.use(
  requireAuth,
);

projectRouter.get(
  "/",
  projectController.list,
);

projectRouter.get(
  "/:projectId",
  validateParams(
    projectIdParamsSchema,
  ),
  requireProjectRole(
    "OWNER",
    "ADMIN",
    "MEMBER",
  ),
  projectController.getById,
);

projectRouter.patch(
  "/:projectId",
  validateParams(
    projectIdParamsSchema,
  ),
  validateBody(
    updateProjectSchema,
  ),
  requireProjectRole(
    "OWNER",
    "ADMIN",
  ),
  projectController.update,
);

projectRouter.delete(
  "/:projectId",
  validateParams(
    projectIdParamsSchema,
  ),
  requireProjectRole(
    "OWNER",
    "ADMIN",
  ),
  projectController.delete,
);

export default projectRouter;