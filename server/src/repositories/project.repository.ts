import { prisma } from "../config/prisma.js";

export class ProjectRepository {
  async create(
    teamId: string,
    createdById: string,
    data: {
      name: string;
      description?: string;
      dueDate?: Date | null;
    },
  ) {
    return prisma.$transaction(
      async (tx) => {
        /*
         * 1. Cria o projeto
         */
        const project =
          await tx.project.create({
            data: {
              teamId,
              createdById,
              name: data.name,
              description:
                data.description ?? null,
              dueDate:
                data.dueDate ?? null,
            },
          });

        /*
         * 2. Cria o quadro principal
         */
        const board =
          await tx.board.create({
            data: {
              projectId: project.id,
              name: "Quadro principal",
            },
          });

        /*
         * 3. Cria as colunas padrão
         */
        await tx.boardColumn.createMany({
          data: [
            {
              boardId: board.id,
              name: "A Fazer",
              type: "TODO",
              position: 0,
            },
            {
              boardId: board.id,
              name: "Em Andamento",
              type: "DOING",
              position: 1,
            },
            {
              boardId: board.id,
              name: "Concluído",
              type: "DONE",
              position: 2,
            },
          ],
        });

        return tx.project.findUniqueOrThrow({
          where: {
            id: project.id,
          },

          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },

            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },

            board: {
              include: {
                columns: {
                  orderBy: {
                    position: "asc",
                  },
                },
              },
            },
          },
        });
      },
    );
  }

  async findById(projectId: string) {
    return prisma.project.findUnique({
      where: {
        id: projectId,
      },

      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },

        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },

        board: {
          include: {
            columns: {
              orderBy: {
                position: "asc",
              },

              include: {
                _count: {
                  select: {
                    tasks: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findTeamId(
    projectId: string,
  ) {
    return prisma.project.findUnique({
      where: {
        id: projectId,
      },

      select: {
        teamId: true,
      },
    });
  }

  async findByUserId(
    userId: string,
  ) {
    return prisma.project.findMany({
      where: {
        team: {
          memberships: {
            some: {
              userId,
            },
          },
        },
      },

      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },

        board: {
          include: {
            columns: {
              orderBy: {
                position: "asc",
              },

              include: {
                _count: {
                  select: {
                    tasks: true,
                  },
                },
              },
            },
          },
        },
      },

      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async update(
    projectId: string,
    data: {
      name?: string;
      description?: string | null;
      dueDate?: Date | null;
    },
  ) {
    return prisma.project.update({
      where: {
        id: projectId,
      },

      data,
    });
  }

  async delete(
    projectId: string,
  ) {
    return prisma.project.delete({
      where: {
        id: projectId,
      },
    });
  }
}

export const projectRepository =
  new ProjectRepository();