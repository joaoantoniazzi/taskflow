import { prisma } from "../config/prisma.js";

export class CommentRepository {
  async findByTaskId(taskId: string) {
    return prisma.comment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async findById(commentId: string) {
    return prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            createdById: true,
            assigneeId: true,
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
        },
      },
    });
  }

  async update(
    commentId: string,
    content: string,
  ) {
    return prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async delete(commentId: string) {
    return prisma.comment.delete({
      where: { id: commentId },
    });
  }
}

export const commentRepository =
  new CommentRepository();