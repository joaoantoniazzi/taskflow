import { Router } from "express";
import { notificationController } from "../controllers/notification.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { validateParams } from "../middlewares/validate.js";
import { notificationIdParamsSchema } from "../schemas/notification.schemas.js";

const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get(
  "/",
  notificationController.list,
);

notificationRouter.patch(
  "/read-all",
  notificationController.markAllAsRead,
);

notificationRouter.patch(
  "/:notificationId/read",
  validateParams(notificationIdParamsSchema),
  notificationController.markAsRead,
);

export default notificationRouter;