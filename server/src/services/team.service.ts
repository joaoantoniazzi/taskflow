import { teamRepository } from "../repositories/team.repository.js";

import { userRepository } from "../repositories/user.repository.js";

import { AppError } from "../utils/app-error.js";

import type {
  AddMemberInput,
  CreateTeamInput,
  UpdateMemberRoleInput,
  UpdateTeamInput,
} from "../schemas/team.schemas.js";

export class TeamService {
  async create(userId: string, input: CreateTeamInput) {
    const team = await teamRepository.create(userId, input.name);

    return {
      id: team.id,
      name: team.name,
      role: "OWNER" as const,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  async listUserTeams(userId: string) {
    const memberships = await teamRepository.findByUserId(userId);

    return memberships.map((membership) => ({
      id: membership.team.id,
      name: membership.team.name,
      role: membership.role,
      memberCount: membership.team._count.memberships,
      projectCount: membership.team._count.projects,
      createdAt: membership.team.createdAt,
      updatedAt: membership.team.updatedAt,
    }));
  }

  async getById(teamId: string, requesterId: string) {
    const team = await teamRepository.findById(teamId);

    if (!team) {
      throw new AppError("Equipe não encontrada.", 404, "TEAM_NOT_FOUND");
    }

    const requesterMembership = await teamRepository.findMembership(
      teamId,
      requesterId,
    );

    if (!requesterMembership) {
      throw new AppError(
        "Você não possui acesso a esta equipe.",
        403,
        "TEAM_ACCESS_DENIED",
      );
    }

    return {
      id: team.id,
      name: team.name,
      memberCount: team._count.memberships,
      projectCount: team._count.projects,

      requesterRole: requesterMembership.role,

      members: team.memberships.map((membership) => ({
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        avatarUrl: membership.user.avatarUrl,
        role: membership.role,
        joinedAt: membership.joinedAt,
      })),

      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  async update(teamId: string, input: UpdateTeamInput) {
    const existing = await teamRepository.findById(teamId);

    if (!existing) {
      throw new AppError("Equipe não encontrada.", 404, "TEAM_NOT_FOUND");
    }

    const team = await teamRepository.update(teamId, input.name);

    return {
      id: team.id,
      name: team.name,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  async delete(teamId: string) {
    const existing = await teamRepository.findById(teamId);

    if (!existing) {
      throw new AppError("Equipe não encontrada.", 404, "TEAM_NOT_FOUND");
    }

    await teamRepository.delete(teamId);
  }

  async addMember(teamId: string, input: AddMemberInput) {
    const team = await teamRepository.findById(teamId);

    if (!team) {
      throw new AppError("Equipe não encontrada.", 404, "TEAM_NOT_FOUND");
    }

    const user = input.userId
      ? await userRepository.findById(input.userId)
      : input.email
        ? await userRepository.findByEmail(input.email)
        : null;

    if (!user) {
      throw new AppError(
        "Usuário não encontrado. Verifique se o e-mail está cadastrado.",
        404,
        "USER_NOT_FOUND",
      );
    }

    const existing = await teamRepository.findMembership(teamId, user.id);

    if (existing) {
      throw new AppError(
        "Usuário já pertence à equipe.",
        409,
        "USER_ALREADY_IN_TEAM",
      );
    }

    const membership = await teamRepository.addMember(
      teamId,
      user.id,
      input.role,
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      role: membership.role,
      joinedAt: membership.joinedAt,
    };
  }

  async updateMemberRole(
    teamId: string,
    userId: string,
    input: UpdateMemberRoleInput,
  ) {
    const membership = await teamRepository.findMembership(teamId, userId);

    if (!membership) {
      throw new AppError(
        "Membro não encontrado.",
        404,
        "TEAM_MEMBER_NOT_FOUND",
      );
    }

    if (membership.role === "OWNER") {
      throw new AppError(
        "O proprietário da equipe não pode ter o papel alterado.",
        400,
        "OWNER_ROLE_IMMUTABLE",
      );
    }

    const updated = await teamRepository.updateMemberRole(
      teamId,
      userId,
      input.role,
    );

    return {
      userId: updated.userId,
      role: updated.role,
    };
  }

  async removeMember(teamId: string, userId: string, requesterId: string) {
    const membership = await teamRepository.findMembership(teamId, userId);

    if (!membership) {
      throw new AppError(
        "Membro não encontrado.",
        404,
        "TEAM_MEMBER_NOT_FOUND",
      );
    }

    if (membership.role === "OWNER") {
      throw new AppError(
        "O proprietário da equipe não pode ser removido.",
        400,
        "OWNER_CANNOT_BE_REMOVED",
      );
    }

    if (userId === requesterId) {
      throw new AppError(
        "Não é possível remover a si mesmo desta equipe.",
        400,
        "SELF_REMOVAL_NOT_ALLOWED",
      );
    }

    await teamRepository.removeMember(teamId, userId);
  }
}

export const teamService = new TeamService();
