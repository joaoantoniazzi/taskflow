import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  projectRepository,
} from "../repositories/project.repository.js";

import {
  teamRepository,
} from "../repositories/team.repository.js";

import {
  AppError,
} from "../utils/app-error.js";

type TeamRole =
  | "OWNER"
  | "ADMIN"
  | "MEMBER";

export function requireProjectRole(
  ...allowedRoles: TeamRole[]
) {
  return async (
    request: Request,
    _response: Response,
    next: NextFunction,
  ) => {
    try {
      const userId =
        request.user?.id;

      const projectId =
        request.params.projectId;

      if (!userId) {
        next(
          new AppError(
            "Autenticação necessária.",
            401,
            "AUTHENTICATION_REQUIRED",
          ),
        );

        return;
      }

      if (!projectId) {
        next(
          new AppError(
            "Projeto não informado.",
            400,
            "PROJECT_ID_REQUIRED",
          ),
        );

        return;
      }

      const project =
        await projectRepository.findTeamId(
          projectId,
        );

      if (!project) {
        next(
          new AppError(
            "Projeto não encontrado.",
            404,
            "PROJECT_NOT_FOUND",
          ),
        );

        return;
      }

      const membership =
        await teamRepository.findMembership(
          project.teamId,
          userId,
        );

      if (!membership) {
        next(
          new AppError(
            "Você não possui acesso a este projeto.",
            403,
            "PROJECT_ACCESS_DENIED",
          ),
        );

        return;
      }

      if (
        !allowedRoles.includes(
          membership.role,
        )
      ) {
        next(
          new AppError(
            "Você não possui permissão para realizar esta operação.",
            403,
            "INSUFFICIENT_PROJECT_PERMISSION",
          ),
        );

        return;
      }

      request.projectRole =
        membership.role;

      next();
    } catch (error) {
      next(error);
    }
  };
}