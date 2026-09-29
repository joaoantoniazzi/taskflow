import * as z from "zod";

const uuidSchema = z.uuid();

export const taskIdParamsSchema = z.object({
  taskId: uuidSchema,
});

export const projectTaskParamsSchema = z.object({
  projectId: uuidSchema,
});

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(
      1,
      "Título da tarefa é obrigatório.",
    )
    .max(200),

  description: z
    .string()
    .trim()
    .max(10000)
    .nullable()
    .optional(),

  priority: z
    .enum([
      "LOW",
      "MEDIUM",
      "HIGH",
    ])
    .default("MEDIUM"),

  assigneeId: uuidSchema
    .nullable()
    .optional(),

  dueDate: z
    .coerce
    .date()
    .nullable()
    .optional(),

  /*
   * Opcional.
   *
   * Se não for informado, a tarefa será
   * criada na primeira coluna TODO.
   */
  columnId: uuidSchema
    .optional(),
});

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(
        1,
        "Título da tarefa é obrigatório.",
      )
      .max(200)
      .optional(),

    description: z
      .string()
      .trim()
      .max(10000)
      .nullable()
      .optional(),

    priority: z
      .enum([
        "LOW",
        "MEDIUM",
        "HIGH",
      ])
      .optional(),

    assigneeId: uuidSchema
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

export const moveTaskSchema = z.object({
  columnId: uuidSchema,

  position: z
    .number()
    .int()
    .min(0),
});

export type CreateTaskInput =
  z.infer<typeof createTaskSchema>;

export type UpdateTaskInput =
  z.infer<typeof updateTaskSchema>;

export type MoveTaskInput =
  z.infer<typeof moveTaskSchema>;