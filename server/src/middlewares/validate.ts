import type {
  NextFunction,
  Request,
  Response,
} from "express";

import * as z from "zod";

import { AppError } from "../utils/app-error.js";

export function validateBody(
  schema: z.ZodType,
) {
  return (
    request: Request,
    _response: Response,
    next: NextFunction,
  ) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      next(
        new AppError(
          "Dados inválidos.",
          400,
          "VALIDATION_ERROR",
          z.treeifyError(result.error),
        ),
      );

      return;
    }

    request.body = result.data;

    next();
  };
}

export function validateParams(
  schema: z.ZodType,
) {
  return (
    request: Request,
    _response: Response,
    next: NextFunction,
  ) => {
    const result = schema.safeParse(
      request.params,
    );

    if (!result.success) {
      next(
        new AppError(
          "Parâmetros inválidos.",
          400,
          "INVALID_PARAMETERS",
          z.treeifyError(result.error),
        ),
      );

      return;
    }

    request.params = result.data;

    next();
  };
}