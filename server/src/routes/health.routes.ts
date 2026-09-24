import { Router } from "express";
import { prisma } from "../config/prisma.js";

const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.json({
    status: "ok",
    service: "taskflow-api",
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/db", async (_request, response) => {
  await prisma.$queryRaw`SELECT 1`;

  response.json({
    status: "ok",
    database: "connected",
    timestamp: new Date().toISOString(),
  });
});

export default healthRouter;