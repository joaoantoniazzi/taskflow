import type {
  Request,
  Response,
} from "express";

import {
  boardService,
} from "../services/board.service.js";

export class BoardController {
  getByProject = async (
    request: Request,
    response: Response,
  ) => {
    const board =
      await boardService.getByProject(
        request.params.projectId,
      );

    response.status(200).json({
      board,
    });
  };
}

export const boardController =
  new BoardController();