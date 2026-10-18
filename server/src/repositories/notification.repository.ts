import { prisma } from "../config/prisma.js";

export class NotificationRepository {
  async listForUser(userId: string) {
    const [notifications, unreadCount] =
      await prisma.$transaction([
        prisma.notification.findMany({
          where: { userId },
          include: {
            task: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 50,
        }),

        prisma.notification.count({
          where: {
            userId,
            readAt: null,
          },
        }),
      ]);

    return {
      notifications,
      unreadCount,
    };
  }

  async findForUser(
    notificationId: string,
    userId: string,
  ) {
    return prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ) {
    return prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }
}

export const notificationRepository =
  new NotificationRepository();