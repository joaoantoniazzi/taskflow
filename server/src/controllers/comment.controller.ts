import type { Request, Response } from "express";
import { commentService } from "../services/comment.service.js";

export class CommentController {
  list = async (req: Request, res: Response) => {
    const comments = await commentService.list(
      req.params.taskId,
    );

    res.status(200).json({ comments });
  };

  create = async (req: Request, res: Response) => {
    const comment = await commentService.create(
      req.params.taskId,
      req.user!.id,
      req.body,
    );

    res.status(201).json({ comment });
  };

  update = async (req: Request, res: Response) => {
    const comment = await commentService.update(
      req.params.commentId,
      req.user!.id,
      req.body,
    );

    res.status(200).json({ comment });
  };

  delete = async (req: Request, res: Response) => {
    await commentService.delete(
      req.params.commentId,
      req.user!.id,
    );

    res.status(204).send();
  };
}

export const commentController =
  new CommentController();