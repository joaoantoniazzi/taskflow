import type {
  Prisma,
  PrismaClient,
} from "../generated/prisma/client.js";

import {
  prisma,
} from "../config/prisma.js";

type DatabaseClient =
  | PrismaClient
  | Prisma.TransactionClient;

export class TaskRepository {
  async create(
    db: DatabaseClient,
    data: {
      columnId: string;
      assigneeId?: string | null;
      createdById: string;
      title: string;
      description?: string | null;
      priority:
        | "LOW"
        | "MEDIUM"
        | "HIGH";
      dueDate?: Date | null;
      position: number;
      completedAt?: Date | null;
    },
  ) {
    return db.task.create({
      data,
      include: {
        column: {
          include: {
            board: {
              include: {
                project: {
                  select: {
                    id: true,
                    teamId: true,
                    name: true,
                  },
                },
              },
            },
          },
        },

        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },

        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findById(
    taskId: string,
  ) {
    return prisma.task.findUnique({
      where: {
        id: taskId,
      },

      include: {
        column: {
          include: {
            board: {
              include: {
                project: {
                  select: {
                    id: true,
                    name: true,
                    teamId: true,
                  },
                },
              },
            },
          },
        },

        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },

        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async findTeamId(
    taskId: string,
  ) {
    const task =
      await prisma.task.findUnique({
        where: {
          id: taskId,
        },

        select: {
          column: {
            select: {
              board: {
                select: {
                  project: {
                    select: {
                      teamId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    return (
      task?.column.board.project
        .teamId ?? null
    );
  }

  async countByColumnId(
    db: DatabaseClient,
    columnId: string,
  ) {
    return db.task.count({
      where: {
        columnId,
      },
    });
  }

  async update(
    db: DatabaseClient,
    taskId: string,
    data: {
      title?: string;
      description?: string | null;
      priority?: "LOW" | "MEDIUM" | "HIGH";
      assigneeId?: string | null;
      dueDate?: Date | null;
    },
  ) {
    return db.task.update({
      where: { id: taskId },
      data,
      include: {
        column: {
          include: {
            board: {
              include: {
                project: {
                  select: {
                    id: true,
                    teamId: true,
                  },
                },
              },
            },
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async delete(
    taskId: string,
  ) {
    return prisma.task.delete({
      where: {
        id: taskId,
      },
    });
  }

  async updatePosition(
    db: DatabaseClient,
    taskId: string,
    columnId: string,
    position: number,
    completedAt: Date | null,
  ) {
    return db.task.update({
      where: {
        id: taskId,
      },

      data: {
        columnId,
        position,
        completedAt,
      },
    });
  }

  async decrementPositions(
    db: DatabaseClient,
    columnId: string,
    minimumPosition: number,
  ) {
    return db.task.updateMany({
      where: {
        columnId,

        position: {
          gt: minimumPosition,
        },
      },

      data: {
        position: {
          decrement: 1,
        },
      },
    });
  }

  async incrementPositions(
    db: DatabaseClient,
    columnId: string,
    minimumPosition: number,
    maximumPosition?: number,
  ) {
    const positionFilter:
      Prisma.IntFilter = {
        gte: minimumPosition,
      };

    if (
      maximumPosition !==
      undefined
    ) {
      positionFilter.lt =
        maximumPosition;
    }

    return db.task.updateMany({
      where: {
        columnId,

        position:
          positionFilter,
      },

      data: {
        position: {
          increment: 1,
        },
      },
    });
  }

  async shiftPositionsSameColumn(
    db: DatabaseClient,
    columnId: string,
    oldPosition: number,
    newPosition: number,
  ) {
    if (newPosition > oldPosition) {
      return db.task.updateMany({
        where: {
          columnId,

          position: {
            gt: oldPosition,
            lte: newPosition,
          },
        },

        data: {
          position: {
            decrement: 1,
          },
        },
      });
    }

    if (newPosition < oldPosition) {
      return db.task.updateMany({
        where: {
          columnId,

          position: {
            gte: newPosition,
            lt: oldPosition,
          },
        },

        data: {
          position: {
            increment: 1,
          },
        },
      });
    }

    return null;
  }
}

export const taskRepository =
  new TaskRepository();
