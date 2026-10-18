import { Router } from "express";
import { commentController } from "../controllers/comment.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireTaskRole } from "../middlewares/require-task-role.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import {
  taskCommentsParamsSchema,
  commentIdParamsSchema,
  createCommentSchema,
  updateCommentSchema,
} from "../schemas/comment.schemas.js";

const commentRouter = Router();

commentRouter.use(requireAuth);

commentRouter.get(
  "/tasks/:taskId/comments",
  validateParams(taskCommentsParamsSchema),
  requireTaskRole("OWNER", "ADMIN", "MEMBER"),
  commentController.list,
);

commentRouter.post(
  "/tasks/:taskId/comments",
  validateParams(taskCommentsParamsSchema),
  validateBody(createCommentSchema),
  requireTaskRole("OWNER", "ADMIN", "MEMBER"),
  commentController.create,
);

commentRouter.patch(
  "/comments/:commentId",
  validateParams(commentIdParamsSchema),
  validateBody(updateCommentSchema),
  commentController.update,
);

commentRouter.delete(
  "/comments/:commentId",
  validateParams(commentIdParamsSchema),
  commentController.delete,
);

export default commentRouter;