import { Router } from "express";

import healthRouter from "./health.routes.js";
import authRouter from "./auth.routes.js";
import teamRouter from "./team.routes.js";
import projectRouter from "./project.routes.js";
import taskRouter from "./task.routes.js";
import commentRouter from "./comment.routes.js";
import notificationRouter from "./notification.routes.js";
import userRouter from "./user.routes.js";

const router = Router();

router.use("/health", healthRouter);

router.use("/auth", authRouter);

router.use("/teams", teamRouter);

router.use("/projects", projectRouter);

router.use("/tasks", taskRouter);

router.use(commentRouter);

router.use("/notifications", notificationRouter);

router.use("/users", userRouter);

export default router;
