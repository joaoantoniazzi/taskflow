import { Router } from "express";

import {
  projectController,
} from "../controllers/project.controller.js";

import {
  boardController,
} from "../controllers/board.controller.js";

import {
  taskController,
} from "../controllers/task.controller.js";

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
} from "../schemas/project.schemas.js";

import {
  createTaskSchema,
  projectTaskParamsSchema,
} from "../schemas/task.schemas.js";

const projectRouter = Router();

projectRouter.use(
  requireAuth,
);

/*
 * Projetos
 */

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

/*
 * Quadro
 */

projectRouter.get(
  "/:projectId/board",
  validateParams(
    projectIdParamsSchema,
  ),
  requireProjectRole(
    "OWNER",
    "ADMIN",
    "MEMBER",
  ),
  boardController.getByProject,
);

/*
 * Tarefas do projeto
 */

projectRouter.get(
  "/:projectId/tasks",
  validateParams(
    projectTaskParamsSchema,
  ),
  requireProjectRole(
    "OWNER",
    "ADMIN",
    "MEMBER",
  ),
  taskController.list,
);

projectRouter.post(
  "/:projectId/tasks",
  validateParams(
    projectTaskParamsSchema,
  ),
  validateBody(
    createTaskSchema,
  ),
  requireProjectRole(
    "OWNER",
    "ADMIN",
    "MEMBER",
  ),
  taskController.create,
);

export default projectRouter;