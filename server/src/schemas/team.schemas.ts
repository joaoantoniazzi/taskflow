import * as z from "zod";

const uuidSchema = z.uuid();

export const teamIdParamsSchema = z.object({
  teamId: uuidSchema,
});

export const teamMemberParamsSchema = z.object({
  teamId: uuidSchema,
  userId: uuidSchema,
});

export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve possuir pelo menos 2 caracteres.")
    .max(120),
});

export const updateTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve possuir pelo menos 2 caracteres.")
    .max(120),
});

export const addMemberSchema = z
  .object({
    userId: uuidSchema.optional(),

    email: z.string().trim().toLowerCase().email().optional(),

    role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
  })
  .refine((data) => Boolean(data.userId) !== Boolean(data.email), {
    message: "Informe userId ou email, mas não ambos.",
  });

export const updateMemberRoleSchema = z.object({
  role: z.enum(["MEMBER", "ADMIN"]),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
