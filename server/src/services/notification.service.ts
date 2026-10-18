import {
  notificationRepository,
} from "../repositories/notification.repository.js";

import { AppError } from "../utils/app-error.js";

export class NotificationService {
  async list(userId: string) {
    const result =
      await notificationRepository.listForUser(
        userId,
      );

    return {
      unreadCount: result.unreadCount,

      notifications:
        result.notifications.map((item) => ({
          id: item.id,
          type: item.type,
          message: item.message,
          readAt: item.readAt,
          createdAt: item.createdAt,
          task: item.task,
        })),
    };
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ) {
    const notification =
      await notificationRepository.findForUser(
        notificationId,
        userId,
      );

    if (!notification) {
      throw new AppError(
        "Notificação não encontrada.",
        404,
        "NOTIFICATION_NOT_FOUND",
      );
    }

    if (notification.readAt === null) {
      await notificationRepository.markAsRead(
        notificationId,
        userId,
      );
    }

    return { success: true };
  }

  async markAllAsRead(userId: string) {
    const result =
      await notificationRepository.markAllAsRead(
        userId,
      );

    return {
      updatedCount: result.count,
    };
  }
}

export const notificationService =
  new NotificationService();