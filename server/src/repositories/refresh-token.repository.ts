import type {
  Prisma,
  PrismaClient,
} from "../generated/prisma/client.js";

import { prisma } from "../config/prisma.js";

type DatabaseClient =
  | PrismaClient
  | Prisma.TransactionClient;

export class RefreshTokenRepository {
  async create(
    db: DatabaseClient,
    data: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    },
  ) {
    return db.refreshToken.create({
      data,
    });
  }

  async findByHash(
    tokenHash: string,
  ) {
    return prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });
  }

  async revoke(
    tokenId: string,
  ) {
    return prisma.refreshToken.update({
      where: {
        id: tokenId,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeIfActive(
    db: DatabaseClient,
    tokenId: string,
  ) {
    return db.refreshToken.updateMany({
      where: {
        id: tokenId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}

export const refreshTokenRepository =
  new RefreshTokenRepository();