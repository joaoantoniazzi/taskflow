import express from "express";
import cors from "cors";
import helmet from "helmet";

import routes from "./routes/index.js";
import { notFound } from "./middlewares/not-found.js";
import { errorHandler } from "./middlewares/error-handler.js";

export const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: true,
  })
);

app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    name: "TaskFlow API",
    version: "1.0.0",
  });
});

app.use("/api/v1", routes);

app.use(notFound);

app.use(errorHandler);