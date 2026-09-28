import type {
  NextFunction,
  Request,
  Response,
} from "express";

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

export function requireTeamRole(
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

      const teamId =
        request.params.teamId;

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

      if (!teamId) {
        next(
          new AppError(
            "Equipe não informada.",
            400,
            "TEAM_ID_REQUIRED",
          ),
        );

        return;
      }

      const membership =
        await teamRepository.findMembership(
          teamId,
          userId,
        );

      if (!membership) {
        next(
          new AppError(
            "Você não possui acesso a esta equipe.",
            403,
            "TEAM_ACCESS_DENIED",
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
            "INSUFFICIENT_TEAM_PERMISSION",
          ),
        );

        return;
      }

      request.teamRole =
        membership.role;

      next();
    } catch (error) {
      next(error);
    }
  };
}