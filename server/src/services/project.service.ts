import {
  projectRepository,
} from "../repositories/project.repository.js";

import {
  AppError,
} from "../utils/app-error.js";

import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "../schemas/project.schemas.js";

export class ProjectService {
  async create(
    teamId: string,
    userId: string,
    input: CreateProjectInput,
  ) {
    /*
     * requireTeamRole já garante que o usuário
     * pertence à equipe quando o endpoint for
     * chamado pela rota correta.
     */
    const project =
      await projectRepository.create(
        teamId,
        userId,
        input,
      );

    return {
      id: project.id,
      name: project.name,
      description:
        project.description,
      dueDate: project.dueDate,

      team: project.team,

      createdBy:
        project.createdBy,

      board: {
        id: project.board!.id,
        name: project.board!.name,

        columns:
          project.board!.columns.map(
            (column) => ({
              id: column.id,
              name: column.name,
              type: column.type,
              position:
                column.position,
              wipLimit:
                column.wipLimit,
            }),
          ),
      },

      createdAt:
        project.createdAt,
      updatedAt:
        project.updatedAt,
    };
  }

  async list(
    userId: string,
  ) {
    const projects =
      await projectRepository.findByUserId(
        userId,
      );

    return projects.map(
      (project) => {
        const taskCount =
          project.board?.columns.reduce(
            (
              total,
              column,
            ) =>
              total +
              column._count.tasks,
            0,
          ) ?? 0;

        return {
          id: project.id,
          name: project.name,
          description:
            project.description,
          dueDate: project.dueDate,

          team: project.team,

          taskCount,

          createdAt:
            project.createdAt,
          updatedAt:
            project.updatedAt,
        };
      },
    );
  }

  async getById(
    projectId: string,
  ) {
    const project =
      await projectRepository.findById(
        projectId,
      );

    if (!project) {
      throw new AppError(
        "Projeto não encontrado.",
        404,
        "PROJECT_NOT_FOUND",
      );
    }

    const taskCount =
      project.board?.columns.reduce(
        (
          total,
          column,
        ) =>
          total +
          column._count.tasks,
        0,
      ) ?? 0;

    return {
      id: project.id,
      name: project.name,
      description:
        project.description,
      dueDate: project.dueDate,

      team: project.team,

      createdBy:
        project.createdBy,

      taskCount,

      board: project.board
        ? {
            id:
              project.board.id,

            name:
              project.board.name,

            columns:
              project.board.columns.map(
                (column) => ({
                  id: column.id,
                  name:
                    column.name,
                  type:
                    column.type,
                  position:
                    column.position,
                  wipLimit:
                    column.wipLimit,
                  taskCount:
                    column._count
                      .tasks,
                }),
              ),
          }
        : null,

      createdAt:
        project.createdAt,
      updatedAt:
        project.updatedAt,
    };
  }

  async update(
    projectId: string,
    input: UpdateProjectInput,
  ) {
    const existing =
      await projectRepository.findById(
        projectId,
      );

    if (!existing) {
      throw new AppError(
        "Projeto não encontrado.",
        404,
        "PROJECT_NOT_FOUND",
      );
    }

    const project =
      await projectRepository.update(
        projectId,
        input,
      );

    return {
      id: project.id,
      name: project.name,
      description:
        project.description,
      dueDate: project.dueDate,
      createdAt:
        project.createdAt,
      updatedAt:
        project.updatedAt,
    };
  }

  async delete(
    projectId: string,
  ) {
    const existing =
      await projectRepository.findById(
        projectId,
      );

    if (!existing) {
      throw new AppError(
        "Projeto não encontrado.",
        404,
        "PROJECT_NOT_FOUND",
      );
    }

    await projectRepository.delete(
      projectId,
    );
  }
}

export const projectService =
  new ProjectService();