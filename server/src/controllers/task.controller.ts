import type {
  Request,
  Response,
} from "express";

import {
  taskService,
} from "../services/task.service.js";

export class TaskController {
  create = async (
    request: Request,
    response: Response,
  ) => {
    const task =
      await taskService.create(
        request.params.projectId,
        request.user!.id,
        request.body,
      );

    response.status(201).json({
      task,
    });
  };

  list = async (
    request: Request,
    response: Response,
  ) => {
    const tasks =
      await taskService.listByProject(
        request.params.projectId,
      );

    response.status(200).json({
      tasks,
    });
  };

  getById = async (
    request: Request,
    response: Response,
  ) => {
    const task =
      await taskService.getById(
        request.params.taskId,
      );

    response.status(200).json({
      task,
    });
  };

  update = async (
    request: Request,
    response: Response,
  ) => {
    const task =
      await taskService.update(
        request.params.taskId,
        request.body,
      );

    response.status(200).json({
      task,
    });
  };

  delete = async (
    request: Request,
    response: Response,
  ) => {
    await taskService.delete(
      request.params.taskId,
    );

    response.status(204).send();
  };

  move = async (
    request: Request,
    response: Response,
  ) => {
    const task =
      await taskService.move(
        request.params.taskId,
        request.body,
      );

    response.status(200).json({
      task,
    });
  };
}

export const taskController =
  new TaskController();