import "dotenv/config";
import * as z from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3000),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET deve possuir pelo menos 32 caracteres."),

  JWT_ISSUER: z
    .string()
    .min(1)
    .default("taskflow-api"),

  JWT_AUDIENCE: z
    .string()
    .min(1)
    .default("taskflow-mobile"),

  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .min(1)
    .default("15m"),

  REFRESH_TOKEN_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:");
  console.error(z.prettifyError(parsed.error));

  process.exit(1);
}

export const env = parsed.data;