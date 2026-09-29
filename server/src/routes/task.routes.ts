import { Router } from "express";

import {
  taskController,
} from "../controllers/task.controller.js";

import {
  requireAuth,
} from "../middlewares/require-auth.js";

import {
  requireTaskRole,
} from "../middlewares/require-task-role.js";

import {
  validateBody,
  validateParams,
} from "../middlewares/validate.js";

import {
  taskIdParamsSchema,
  updateTaskSchema,
  moveTaskSchema,
} from "../schemas/task.schemas.js";

const taskRouter = Router();

taskRouter.use(
  requireAuth,
);

/*
 * Consulta
 */

taskRouter.get(
  "/:taskId",
  validateParams(
    taskIdParamsSchema,
  ),
  requireTaskRole(
    "OWNER",
    "ADMIN",
    "MEMBER",
  ),
  taskController.getById,
);

/*
 * Edição
 */

taskRouter.patch(
  "/:taskId",
  validateParams(
    taskIdParamsSchema,
  ),
  validateBody(
    updateTaskSchema,
  ),
  requireTaskRole(
    "OWNER",
    "ADMIN",
    "MEMBER",
  ),
  taskController.update,
);

/*
 * Movimentação Kanban
 */

taskRouter.patch(
  "/:taskId/move",
  validateParams(
    taskIdParamsSchema,
  ),
  validateBody(
    moveTaskSchema,
  ),
  requireTaskRole(
    "OWNER",
    "ADMIN",
    "MEMBER",
  ),
  taskController.move,
);

/*
 * Exclusão
 */

taskRouter.delete(
  "/:taskId",
  validateParams(
    taskIdParamsSchema,
  ),
  requireTaskRole(
    "OWNER",
    "ADMIN",
  ),
  taskController.delete,
);

export default taskRouter;