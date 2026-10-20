import type { Request, Response } from "express";
import { userService } from "../services/user.service.js";

export class UserController {
  getMe = async (req: Request, res: Response) => {
    const user = await userService.getProfile(req.user!.id);

    res.status(200).json({ user });
  };

  updateMe = async (req: Request, res: Response) => {
    const user = await userService.updateProfile(req.user!.id, req.body);

    res.status(200).json({ user });
  };
}

export const userController = new UserController();
