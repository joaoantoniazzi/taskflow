import { prisma } from "../config/prisma.js";

export class BoardRepository {
  async findByProjectId(
    projectId: string,
  ) {
    return prisma.board.findUnique({
      where: {
        projectId,
      },

      include: {
        columns: {
          orderBy: {
            position: "asc",
          },

          include: {
            tasks: {
              orderBy: {
                position: "asc",
              },

              include: {
                assignee: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findColumnByProject(
    projectId: string,
    columnId: string,
  ) {
    return prisma.boardColumn.findFirst({
      where: {
        id: columnId,

        board: {
          projectId,
        },
      },

      select: {
        id: true,
        name: true,
        type: true,
        position: true,
        wipLimit: true,

        board: {
          select: {
            id: true,
            projectId: true,
          },
        },
      },
    });
  }

  async findTodoColumn(
    projectId: string,
  ) {
    return prisma.boardColumn.findFirst({
      where: {
        type: "TODO",

        board: {
          projectId,
        },
      },

      orderBy: {
        position: "asc",
      },

      select: {
        id: true,
        name: true,
        type: true,
        position: true,
        wipLimit: true,

        board: {
          select: {
            id: true,
            projectId: true,
          },
        },
      },
    });
  }
}

export const boardRepository =
  new BoardRepository();