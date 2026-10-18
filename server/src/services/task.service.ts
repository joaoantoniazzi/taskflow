import {
  prisma,
} from "../config/prisma.js";

import {
  taskRepository,
} from "../repositories/task.repository.js";

import {
  boardRepository,
} from "../repositories/board.repository.js";

import {
  projectRepository,
} from "../repositories/project.repository.js";

import {
  teamRepository,
} from "../repositories/team.repository.js";

import {
  AppError,
} from "../utils/app-error.js";

import type {
  CreateTaskInput,
  MoveTaskInput,
  UpdateTaskInput,
} from "../schemas/task.schemas.js";

function toTaskResponse(
  task: Awaited<
    ReturnType<
      typeof taskRepository.findById
    >
  >,
) {
  if (!task) {
    return null;
  }

  return {
    id: task.id,

    title: task.title,

    description:
      task.description,

    priority:
      task.priority,

    dueDate:
      task.dueDate,

    position:
      task.position,

    completedAt:
      task.completedAt,

    column: {
      id:
        task.column.id,

      name:
        task.column.name,

      type:
        task.column.type,

      position:
        task.column.position,
    },

    project: {
      id:
        task.column.board.project.id,

      name:
        task.column.board.project.name,
    },

    assignee:
      task.assignee,

    createdBy:
      task.createdBy,

    createdAt:
      task.createdAt,

    updatedAt:
      task.updatedAt,
  };
}

export class TaskService {
  async create(
    projectId: string,
    userId: string,
    input: CreateTaskInput,
  ) {
    const teamInfo =
      await projectRepository.findTeamId(
        projectId,
      );

    if (!teamInfo) {
      throw new AppError(
        "Projeto não encontrado.",
        404,
        "PROJECT_NOT_FOUND",
      );
    }

    /*
     * Determina a coluna.
     *
     * Sem columnId:
     * → primeira coluna TODO.
     */
    const column =
      input.columnId
        ? await boardRepository
            .findColumnByProject(
              projectId,
              input.columnId,
            )
        : await boardRepository
            .findTodoColumn(
              projectId,
            );

    if (!column) {
      throw new AppError(
        "Coluna não encontrada.",
        404,
        "COLUMN_NOT_FOUND",
      );
    }

    /*
     * Validação do responsável.
     */
    if (input.assigneeId) {
      const membership =
        await teamRepository
          .findMembership(
            teamInfo.teamId,
            input.assigneeId,
          );

      if (!membership) {
        throw new AppError(
          "O responsável precisa pertencer à equipe do projeto.",
          400,
          "ASSIGNEE_NOT_IN_PROJECT_TEAM",
        );
      }
    }

    /*
     * A nova tarefa entra no final
     * da coluna.
     */
    const currentCount =
      await taskRepository
        .countByColumnId(
          prisma,
          column.id,
        );

    /*
     * Respeita WIP no momento da criação.
     */
    if (
      column.wipLimit !== null &&
      currentCount >=
        column.wipLimit
    ) {
      throw new AppError(
        "O limite de trabalho em progresso desta coluna foi atingido.",
        409,
        "WIP_LIMIT_REACHED",
      );
    }

    const completedAt =
      column.type === "DONE"
        ? new Date()
        : null;

    const task =
      await taskRepository.create(
        prisma,
        {
          columnId:
            column.id,

          assigneeId:
            input.assigneeId ??
            null,

          createdById:
            userId,

          title:
            input.title,

          description:
            input.description ??
            null,

          priority:
            input.priority,

          dueDate:
            input.dueDate ??
            null,

          position:
            currentCount,

          completedAt,
        },
      );

    return toTaskResponse(
      task,
    );
  }

  async listByProject(
    projectId: string,
  ) {
    const board =
      await boardRepository
        .findByProjectId(
          projectId,
        );

    if (!board) {
      throw new AppError(
        "Quadro não encontrado.",
        404,
        "BOARD_NOT_FOUND",
      );
    }

    return board.columns
      .flatMap(
        (column) =>
          column.tasks.map(
            (task) => ({
              id: task.id,
              title: task.title,
              priority:
                task.priority,
              dueDate:
                task.dueDate,
              position:
                task.position,
              completedAt:
                task.completedAt,

              column: {
                id:
                  column.id,
                name:
                  column.name,
                type:
                  column.type,
                position:
                  column.position,
              },

              assignee:
                task.assignee,
            }),
          ),
      );
  }

  async getById(
    taskId: string,
  ) {
    const task =
      await taskRepository.findById(
        taskId,
      );

    if (!task) {
      throw new AppError(
        "Tarefa não encontrada.",
        404,
        "TASK_NOT_FOUND",
      );
    }

    return toTaskResponse(
      task,
    );
  }

  async update(
    taskId: string,
    input: UpdateTaskInput,
  ) {
    const task =
      await taskRepository.findById(
        taskId,
      );

    if (!task) {
      throw new AppError(
        "Tarefa não encontrada.",
        404,
        "TASK_NOT_FOUND",
      );
    }

    /*
     * Se houver novo responsável,
     * ele precisa estar na equipe.
     */
    if (
      input.assigneeId !==
        undefined &&
      input.assigneeId !==
        null
    ) {
      const membership =
        await teamRepository
          .findMembership(
            task.column.board.project
              .teamId,
            input.assigneeId,
          );

      if (!membership) {
        throw new AppError(
          "O responsável precisa pertencer à equipe do projeto.",
          400,
          "ASSIGNEE_NOT_IN_PROJECT_TEAM",
        );
      }
    }

    const updated = await prisma.$transaction(
      async (tx) => {
        const saved = await taskRepository.update(
          tx,
          taskId,
          {
            ...(input.title !== undefined
              ? { title: input.title }
              : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            ...(input.priority !== undefined
              ? { priority: input.priority }
              : {}),
            ...(input.assigneeId !== undefined
              ? { assigneeId: input.assigneeId }
              : {}),
            ...(input.dueDate !== undefined
              ? { dueDate: input.dueDate }
              : {}),
          },
        );

        const assignmentChanged =
          input.assigneeId !== undefined &&
          input.assigneeId !== null &&
          input.assigneeId !== task.assigneeId;

        if (
          assignmentChanged &&
          input.assigneeId !== userId
        ) {
          await tx.notification.create({
            data: {
              userId: input.assigneeId!,
              taskId,
              type: "TASK_ASSIGNED",
              message:
                `Você recebeu a tarefa "${saved.title}".`,
            },
          });
        }

        return saved;
      },
    );

    return toTaskResponse(
      updated,
    );
  }

  async delete(
    taskId: string,
  ) {
    const task =
      await taskRepository.findById(
        taskId,
      );

    if (!task) {
      throw new AppError(
        "Tarefa não encontrada.",
        404,
        "TASK_NOT_FOUND",
      );
    }

    await taskRepository.delete(
      taskId,
    );
  }

  async move(
    taskId: string,
    input: MoveTaskInput,
  ) {
    const task =
      await taskRepository.findById(
        taskId,
      );

    if (!task) {
      throw new AppError(
        "Tarefa não encontrada.",
        404,
        "TASK_NOT_FOUND",
      );
    }

    const projectId =
      task.column.board.project.id;

    const destination =
      await boardRepository
        .findColumnByProject(
          projectId,
          input.columnId,
        );

    if (!destination) {
      throw new AppError(
        "A coluna de destino não pertence a este projeto.",
        400,
        "INVALID_DESTINATION_COLUMN",
      );
    }

    const sourceColumnId =
      task.column.id;

    const sameColumn =
      sourceColumnId ===
      destination.id;

    /*
     * Quantidade de tarefas
     * atualmente na coluna destino.
     */
    const destinationCount =
      await taskRepository
        .countByColumnId(
          prisma,
          destination.id,
        );

    /*
     * Quando mudamos de coluna,
     * a tarefa atual não está na
     * contagem da coluna destino.
     *
     * Quando permanecemos na mesma,
     * a posição máxima é count - 1.
     */
    const maximumPosition =
      sameColumn
        ? destinationCount - 1
        : destinationCount;

    if (
      input.position >
      maximumPosition
    ) {
      throw new AppError(
        `Posição inválida. A posição máxima permitida é ${maximumPosition}.`,
        400,
        "INVALID_TASK_POSITION",
      );
    }

    /*
     * WIP somente precisa ser verificado
     * quando efetivamente entramos em
     * outra coluna.
     */
    if (
      !sameColumn &&
      destination.wipLimit !==
        null &&
      destinationCount >=
        destination.wipLimit
    ) {
      throw new AppError(
        "O limite de trabalho em progresso desta coluna foi atingido.",
        409,
        "WIP_LIMIT_REACHED",
      );
    }

    /*
     * Não há trabalho a fazer.
     */
    if (
      sameColumn &&
      input.position ===
        task.position
    ) {
      return this.getById(
        taskId,
      );
    }

    const oldPosition =
      task.position;

    const newPosition =
      input.position;

    let completedAt =
      task.completedAt;

    /*
     * Estado de conclusão acompanha
     * o tipo da coluna.
     */
    if (
      destination.type ===
      "DONE" &&
      task.column.type !==
        "DONE"
    ) {
      completedAt =
        new Date();
    }

    if (
      destination.type !==
        "DONE" &&
      task.column.type ===
        "DONE"
    ) {
      completedAt = null;
    }

    await prisma.$transaction(
      async (tx) => {
        if (sameColumn) {
          await taskRepository
            .shiftPositionsSameColumn(
              tx,
              destination.id,
              oldPosition,
              newPosition,
            );
        } else {
          /*
           * Remove o espaço ocupado
           * pela tarefa na coluna antiga.
           */
          await taskRepository
            .decrementPositions(
              tx,
              sourceColumnId,
              oldPosition,
            );

          /*
           * Abre espaço na posição desejada
           * da coluna nova.
           */
          await taskRepository
            .incrementPositions(
              tx,
              destination.id,
              newPosition,
            );
        }

        await taskRepository
          .updatePosition(
            tx,
            taskId,
            destination.id,
            newPosition,
            completedAt,
          );
      },
    );

    return this.getById(
      taskId,
    );
  }
}

export const taskService =
  new TaskService();
