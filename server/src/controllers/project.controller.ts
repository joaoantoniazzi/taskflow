import type {
  Request,
  Response,
} from "express";

import {
  projectService,
} from "../services/project.service.js";

export class ProjectController {
  create = async (
    request: Request,
    response: Response,
  ) => {
    const project =
      await projectService.create(
        request.params.teamId,
        request.user!.id,
        request.body,
      );

    response.status(201).json({
      project,
    });
  };

  list = async (
    request: Request,
    response: Response,
  ) => {
    const projects =
      await projectService.list(
        request.user!.id,
      );

    response.status(200).json({
      projects,
    });
  };

  getById = async (
    request: Request,
    response: Response,
  ) => {
    const project =
      await projectService.getById(
        request.params.projectId,
      );

    response.status(200).json({
      project,
    });
  };

  update = async (
    request: Request,
    response: Response,
  ) => {
    const project =
      await projectService.update(
        request.params.projectId,
        request.body,
      );

    response.status(200).json({
      project,
    });
  };

  delete = async (
    request: Request,
    response: Response,
  ) => {
    await projectService.delete(
      request.params.projectId,
    );

    response.status(204).send();
  };
}

export const projectController =
  new ProjectController();