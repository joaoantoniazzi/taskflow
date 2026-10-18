import { prisma } from "../config/prisma.js";
import { commentRepository } from "../repositories/comment.repository.js";
import { teamRepository } from "../repositories/team.repository.js";
import { AppError } from "../utils/app-error.js";
import type { CreateCommentInput } from "../schemas/comment.schemas.js";

export class CommentService {
  async list(
    taskId: string,
  ) {
    const comments =
      await commentRepository.findByTaskId(taskId);

    return comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      author: comment.user,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    }));
  }

  async create(
    taskId: string,
    authorId: string,
    input: CreateCommentInput,
  ) {
    return prisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({
        where: { id: taskId },
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
      });

      if (!task) {
        throw new AppError(
          "Tarefa não encontrada.",
          404,
          "TASK_NOT_FOUND",
        );
      }

      const author = await tx.user.findUnique({
        where: { id: authorId },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      });

      if (!author) {
        throw new AppError(
          "Usuário não encontrado.",
          404,
          "USER_NOT_FOUND",
        );
      }

      // Identifica os participantes que já comentaram.
      const previousComments = await tx.comment.findMany({
        where: { taskId },
        select: { userId: true },
      });

      const recipientIds = [
        ...new Set([
          task.createdById,
          ...(task.assigneeId ? [task.assigneeId] : []),
          ...previousComments.map((comment) => comment.userId),
        ]),
      ].filter((id) => id !== authorId);

      const teamId =
        task.column.board.project.teamId;

      // Somente membros atuais da equipe recebem o aviso.
      const currentMembers = recipientIds.length
        ? await tx.teamMember.findMany({
            where: {
              teamId,
              userId: { in: recipientIds },
            },
            select: { userId: true },
          })
        : [];

      const comment = await tx.comment.create({
        data: {
          taskId,
          userId: authorId,
          content: input.content,
        },
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

      if (currentMembers.length > 0) {
        await tx.notification.createMany({
          data: currentMembers.map((member) => ({
            userId: member.userId,
            taskId,
            type: "TASK_COMMENTED" as const,
            message:
              `${author.name} comentou na tarefa "${task.title}".`,
          })),
        });
      }

      return {
        id: comment.id,
        content: comment.content,
        author: comment.user,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      };
    });
  }

  private async getCommentAndCheckPermission(
    commentId: string,
    userId: string,
  ) {
    const comment =
      await commentRepository.findById(commentId);

    if (!comment) {
      throw new AppError(
        "Comentário não encontrado.",
        404,
        "COMMENT_NOT_FOUND",
      );
    }

    const teamId =
      comment.task.column.board.project.teamId;

    const membership =
      await teamRepository.findMembership(
        teamId,
        userId,
      );

    if (!membership) {
      throw new AppError(
        "Você não possui acesso a este comentário.",
        403,
        "COMMENT_ACCESS_DENIED",
      );
    }

    // O autor pode editar/excluir o próprio comentário.
    // OWNER e ADMIN também podem moderar comentários.
    const mayModerate =
      membership.role === "OWNER" ||
      membership.role === "ADMIN";

    if (
      comment.userId !== userId &&
      !mayModerate
    ) {
      throw new AppError(
        "Você só pode editar ou excluir seus próprios comentários.",
        403,
        "COMMENT_MODIFICATION_DENIED",
      );
    }

    return comment;
  }

  async update(
    commentId: string,
    userId: string,
    input: CreateCommentInput,
  ) {
    await this.getCommentAndCheckPermission(
      commentId,
      userId,
    );

    const comment =
      await commentRepository.update(
        commentId,
        input.content,
      );

    return {
      id: comment.id,
      content: comment.content,
      author: comment.user,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  async delete(
    commentId: string,
    userId: string,
  ) {
    await this.getCommentAndCheckPermission(
      commentId,
      userId,
    );

    await commentRepository.delete(commentId);
  }
}

export const commentService =
  new CommentService();