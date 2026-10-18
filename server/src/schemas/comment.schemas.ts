import * as z from "zod";

const uuidSchema = z.uuid();

export const taskCommentsParamsSchema = z.object({
  taskId: uuidSchema,
});

export const commentIdParamsSchema = z.object({
  commentId: uuidSchema,
});

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "O comentário não pode estar vazio.")
    .max(10000),
});

export const updateCommentSchema = createCommentSchema;

export type CreateCommentInput =
  z.infer<typeof createCommentSchema>;