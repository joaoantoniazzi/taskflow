import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../utils/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";

export async function requireAuth(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const authorization =
    request.header("Authorization");

  if (!authorization) {
    next(
      new AppError(
        "Autenticação necessária.",
        401,
        "AUTHENTICATION_REQUIRED",
      ),
    );

    return;
  }

  if (!authorization.startsWith("Bearer ")) {
    next(
      new AppError(
        "Formato de autenticação inválido.",
        401,
        "INVALID_AUTHORIZATION",
      ),
    );

    return;
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    next(
      new AppError(
        "Token não informado.",
        401,
        "INVALID_ACCESS_TOKEN",
      ),
    );

    return;
  }

  try {
    const payload = await verifyAccessToken(
      token,
    );

    request.user = {
      id: payload.sub,
    };

    next();
  } catch {
    next(
      new AppError(
        "Token inválido ou expirado.",
        401,
        "INVALID_ACCESS_TOKEN",
      ),
    );
  }
}