import type { Request, Response } from "express";
import { notificationService } from "../services/notification.service.js";

export class NotificationController {
  list = async (req: Request, res: Response) => {
    const result = await notificationService.list(
      req.user!.id,
    );

    res.status(200).json(result);
  };

  markAsRead = async (req: Request, res: Response) => {
    const result = await notificationService.markAsRead(
      req.params.notificationId,
      req.user!.id,
    );

    res.status(200).json(result);
  };

  markAllAsRead = async (
    req: Request,
    res: Response,
  ) => {
    const result =
      await notificationService.markAllAsRead(
        req.user!.id,
      );

    res.status(200).json(result);
  };
}

export const notificationController =
  new NotificationController();