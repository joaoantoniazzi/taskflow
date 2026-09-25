import type {
  Request,
  Response,
} from "express";

import {
  authService,
} from "../services/auth.service.js";

export class AuthController {
  register = async (
    request: Request,
    response: Response,
  ) => {
    const user =
      await authService.register(
        request.body,
      );

    response.status(201).json({
      user,
    });
  };

  login = async (
    request: Request,
    response: Response,
  ) => {
    const session =
      await authService.login(
        request.body,
      );

    response.status(200).json(
      session,
    );
  };

  refresh = async (
    request: Request,
    response: Response,
  ) => {
    const session =
      await authService.refresh(
        request.body.refreshToken,
      );

    response.status(200).json(
      session,
    );
  };

  logout = async (
    request: Request,
    response: Response,
  ) => {
    await authService.logout(
      request.body.refreshToken,
    );

    response.status(204).send();
  };

  me = async (
    request: Request,
    response: Response,
  ) => {
    /*
     * requireAuth garante que user exista.
     */
    const user =
      await authService.me(
        request.user!.id,
      );

    response.status(200).json({
      user,
    });
  };
}

export const authController =
  new AuthController();