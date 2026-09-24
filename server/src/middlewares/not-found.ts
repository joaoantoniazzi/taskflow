import type {
  Request,
  Response,
} from "express";

export function notFound(
  request: Request,
  response: Response
): void {
  response.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Rota não encontrada: ${request.method} ${request.originalUrl}`,
    },
  });
}