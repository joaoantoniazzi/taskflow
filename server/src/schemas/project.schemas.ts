import * as z from "zod";

const uuidSchema = z.uuid();

export const projectIdParamsSchema = z.object({
  projectId: uuidSchema,
});

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      2,
      "Nome deve possuir pelo menos 2 caracteres.",
    )
    .max(150),

  description: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  dueDate: z
    .coerce
    .date()
    .nullable()
    .optional(),
});

export const updateProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Nome deve possuir pelo menos 2 caracteres.",
      )
      .max(150)
      .optional(),

    description: z
      .string()
      .trim()
      .max(5000)
      .nullable()
      .optional(),

    dueDate: z
      .coerce
      .date()
      .nullable()
      .optional(),
  })
  .refine(
    (data) =>
      Object.keys(data).length > 0,
    {
      message:
        "Informe pelo menos um campo para atualização.",
    },
  );

export type CreateProjectInput =
  z.infer<typeof createProjectSchema>;

export type UpdateProjectInput =
  z.infer<typeof updateProjectSchema>;