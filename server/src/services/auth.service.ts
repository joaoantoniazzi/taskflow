import bcrypt from "bcryptjs";

import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

import {
  AppError,
} from "../utils/app-error.js";

import {
  createAccessToken,
} from "../utils/jwt.js";

import {
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/token.js";

import {
  userRepository,
} from "../repositories/user.repository.js";

import {
  refreshTokenRepository,
} from "../repositories/refresh-token.repository.js";

import type {
  LoginInput,
  RegisterInput,
} from "../schemas/auth.schemas.js";

function toUserResponse(user: {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

export class AuthService {
  async register(input: RegisterInput) {
    const existing =
      await userRepository.findByEmail(
        input.email,
      );

    if (existing) {
      throw new AppError(
        "Este e-mail já está cadastrado.",
        409,
        "EMAIL_ALREADY_EXISTS",
      );
    }

    const passwordHash =
      await bcrypt.hash(input.password, 12);

    try {
      const user =
        await userRepository.create({
          name: input.name,
          email: input.email,
          passwordHash,
        });

      return toUserResponse(user);
    } catch (error: unknown) {
      /*
       * Evita erro 500 caso duas requisições
       * tentem cadastrar o mesmo e-mail
       * simultaneamente.
       */
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "Este e-mail já está cadastrado.",
          409,
          "EMAIL_ALREADY_EXISTS",
        );
      }

      throw error;
    }
  }

  async login(input: LoginInput) {
    const user =
      await userRepository.findByEmail(
        input.email,
      );

    if (!user) {
      throw new AppError(
        "E-mail ou senha inválidos.",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    const passwordMatches =
      await bcrypt.compare(
        input.password,
        user.passwordHash,
      );

    if (!passwordMatches) {
      throw new AppError(
        "E-mail ou senha inválidos.",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    return this.createSession(user.id, user);
  }

  async refresh(refreshToken: string) {
    const tokenHash =
      hashRefreshToken(refreshToken);

    const stored =
      await refreshTokenRepository.findByHash(
        tokenHash,
      );

    if (!stored) {
      throw new AppError(
        "Refresh token inválido.",
        401,
        "INVALID_REFRESH_TOKEN",
      );
    }

    const now = new Date();

    if (
      stored.revokedAt !== null ||
      stored.expiresAt <= now
    ) {
      throw new AppError(
        "Refresh token expirado ou revogado.",
        401,
        "INVALID_REFRESH_TOKEN",
      );
    }

    /*
     * Rotação do refresh token:
     *
     * 1. revoga o token atual
     * 2. cria um novo
     *
     * A operação é transacional.
     */
    const result =
      await prisma.$transaction(
        async (tx) => {
          const revoked =
            await refreshTokenRepository
              .revokeIfActive(
                tx,
                stored.id,
              );

          /*
           * Se outra requisição já tiver
           * utilizado esse token, count será 0.
           */
          if (revoked.count !== 1) {
            throw new AppError(
              "Refresh token inválido.",
              401,
              "INVALID_REFRESH_TOKEN",
            );
          }

          const rawRefreshToken =
            generateRefreshToken();

          const newRefreshTokenHash =
            hashRefreshToken(
              rawRefreshToken,
            );

          const expiresAt =
            new Date();

          expiresAt.setDate(
            expiresAt.getDate() +
              env.REFRESH_TOKEN_DAYS,
          );

          await refreshTokenRepository.create(
            tx,
            {
              userId: stored.userId,
              tokenHash:
                newRefreshTokenHash,
              expiresAt,
            },
          );

          return rawRefreshToken;
        },
      );

    const accessToken =
      await createAccessToken(
        stored.userId,
      );

    return {
      accessToken,
      refreshToken: result,
      user: toUserResponse(stored.user),
    };
  }

  async logout(refreshToken: string) {
    const tokenHash =
      hashRefreshToken(refreshToken);

    const stored =
      await refreshTokenRepository.findByHash(
        tokenHash,
      );

    if (!stored) {
      return;
    }

    if (stored.revokedAt !== null) {
      return;
    }

    await refreshTokenRepository.revoke(
      stored.id,
    );
  }

  async me(userId: string) {
    const user =
      await userRepository.findById(userId);

    if (!user) {
      throw new AppError(
        "Usuário não encontrado.",
        404,
        "USER_NOT_FOUND",
      );
    }

    return toUserResponse(user);
  }

  private async createSession(
    userId: string,
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
      createdAt: Date;
    },
  ) {
    const accessToken =
      await createAccessToken(userId);

    const rawRefreshToken =
      generateRefreshToken();

    const tokenHash =
      hashRefreshToken(
        rawRefreshToken,
      );

    const expiresAt = new Date();

    expiresAt.setDate(
      expiresAt.getDate() +
        env.REFRESH_TOKEN_DAYS,
    );

    await refreshTokenRepository.create(
      prisma,
      {
        userId,
        tokenHash,
        expiresAt,
      },
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: toUserResponse(user),
    };
  }
}

export const authService =
  new AuthService();