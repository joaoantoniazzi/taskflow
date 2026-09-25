import * as z from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve possuir pelo menos 2 caracteres.")
    .max(120),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido.")
    .max(255),

  password: z
    .string()
    .min(8, "Senha deve possuir pelo menos 8 caracteres.")
    .max(72, "Senha excede o tamanho máximo permitido."),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido."),

  password: z
    .string()
    .min(1, "Senha é obrigatória."),
});

export const refreshSchema = z.object({
  refreshToken: z
    .string()
    .min(1, "Refresh token é obrigatório."),
});

export const logoutSchema = refreshSchema;

export type RegisterInput =
  z.infer<typeof registerSchema>;

export type LoginInput =
  z.infer<typeof loginSchema>;

export type RefreshInput =
  z.infer<typeof refreshSchema>;