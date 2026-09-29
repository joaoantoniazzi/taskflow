import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  taskRepository,
} from "../repositories/task.repository.js";

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

export function requireTaskRole(
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

      const taskId =
        request.params.taskId;

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

      if (!taskId) {
        next(
          new AppError(
            "Tarefa não informada.",
            400,
            "TASK_ID_REQUIRED",
          ),
        );

        return;
      }

      const teamId =
        await taskRepository.findTeamId(
          taskId,
        );

      if (!teamId) {
        next(
          new AppError(
            "Tarefa não encontrada.",
            404,
            "TASK_NOT_FOUND",
          ),
        );

        return;
      }

      const membership =
        await teamRepository
          .findMembership(
            teamId,
            userId,
          );

      if (!membership) {
        next(
          new AppError(
            "Você não possui acesso a esta tarefa.",
            403,
            "TASK_ACCESS_DENIED",
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
            "INSUFFICIENT_TASK_PERMISSION",
          ),
        );

        return;
      }

      request.taskRole =
        membership.role;

      next();
    } catch (error) {
      next(error);
    }
  };
}