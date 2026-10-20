import type { Request, Response } from "express";

import { teamService } from "../services/team.service.js";

export class TeamController {
  create = async (request: Request, response: Response) => {
    const team = await teamService.create(request.user!.id, request.body);

    response.status(201).json({
      team,
    });
  };

  list = async (request: Request, response: Response) => {
    const teams = await teamService.listUserTeams(request.user!.id);

    response.status(200).json({
      teams,
    });
  };

  getById = async (request: Request, response: Response) => {
    const team = await teamService.getById(
      request.params.teamId,
      request.user!.id,
    );

    response.status(200).json({
      team,
    });
  };

  update = async (request: Request, response: Response) => {
    const team = await teamService.update(request.params.teamId, request.body);

    response.status(200).json({
      team,
    });
  };

  delete = async (request: Request, response: Response) => {
    await teamService.delete(request.params.teamId);

    response.status(204).send();
  };

  addMember = async (request: Request, response: Response) => {
    const member = await teamService.addMember(
      request.params.teamId,
      request.body,
    );

    response.status(201).json({
      member,
    });
  };

  updateMemberRole = async (request: Request, response: Response) => {
    const member = await teamService.updateMemberRole(
      request.params.teamId,
      request.params.userId,
      request.body,
    );

    response.status(200).json({
      member,
    });
  };

  removeMember = async (request: Request, response: Response) => {
    await teamService.removeMember(
      request.params.teamId,
      request.params.userId,
      request.user!.id,
    );

    response.status(204).send();
  };
}

export const teamController = new TeamController();
