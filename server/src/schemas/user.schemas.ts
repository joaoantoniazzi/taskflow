import * as z from "zod";

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "O nome deve possuir pelo menos 2 caracteres.")
      .max(120)
      .optional(),

    avatarUrl: z
      .string()
      .trim()
      .max(500)
      .url("Informe uma URL válida.")
      .nullable()
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.avatarUrl !== undefined, {
    message: "Informe pelo menos um campo para atualizar.",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
