import {
  boardRepository,
} from "../repositories/board.repository.js";

import {
  AppError,
} from "../utils/app-error.js";

export class BoardService {
  async getByProject(
    projectId: string,
  ) {
    const board =
      await boardRepository.findByProjectId(
        projectId,
      );

    if (!board) {
      throw new AppError(
        "Quadro não encontrado.",
        404,
        "BOARD_NOT_FOUND",
      );
    }

    return {
      id: board.id,
      name: board.name,

      columns:
        board.columns.map(
          (column) => ({
            id: column.id,
            name: column.name,
            type: column.type,
            position:
              column.position,
            wipLimit:
              column.wipLimit,

            tasks:
              column.tasks.map(
                (task) => ({
                  id: task.id,
                  title: task.title,
                  priority:
                    task.priority,
                  dueDate:
                    task.dueDate,
                  position:
                    task.position,
                  completedAt:
                    task.completedAt,
                  description:
                    task.description,

                  assignee:
                    task.assignee,
                }),
              ),
          }),
        ),

      projectId,
    };
  }
}

export const boardService =
  new BoardService();
