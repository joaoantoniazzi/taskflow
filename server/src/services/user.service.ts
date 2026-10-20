import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";
import type { UpdateProfileInput } from "../schemas/user.schemas.js";

export class UserService {
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await userRepository.updateProfile(userId, input);

    return user;
  }
}

export const userService = new UserService();
