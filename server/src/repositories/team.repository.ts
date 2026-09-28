import { prisma } from "../config/prisma.js";

export class TeamRepository {
  async create(
    ownerId: string,
    name: string,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const team =
          await tx.team.create({
            data: {
              name,
            },
          });

        await tx.teamMember.create({
          data: {
            teamId: team.id,
            userId: ownerId,
            role: "OWNER",
          },
        });

        return team;
      },
    );
  }

  async findById(teamId: string) {
    return prisma.team.findUnique({
      where: {
        id: teamId,
      },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },

        _count: {
          select: {
            memberships: true,
            projects: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return prisma.teamMember.findMany({
      where: {
        userId,
      },

      include: {
        team: {
          include: {
            _count: {
              select: {
                memberships: true,
                projects: true,
              },
            },
          },
        },
      },

      orderBy: {
        team: {
          name: "asc",
        },
      },
    });
  }

  async findMembership(
    teamId: string,
    userId: string,
  ) {
    return prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });
  }

  async update(
    teamId: string,
    name: string,
  ) {
    return prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        name,
      },
    });
  }

  async delete(teamId: string) {
    return prisma.team.delete({
      where: {
        id: teamId,
      },
    });
  }

  async addMember(
    teamId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
  ) {
    return prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role,
      },
    });
  }

  async updateMemberRole(
    teamId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
  ) {
    return prisma.teamMember.update({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },

      data: {
        role,
      },
    });
  }

  async removeMember(
    teamId: string,
    userId: string,
  ) {
    return prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });
  }
}

export const teamRepository =
  new TeamRepository();