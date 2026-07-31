import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:3000"),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  SLOW_QUERY_THRESHOLD_MS: z.coerce.number().min(0).default(300),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters long"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters long"),

  // Distributed Rate Limiting & Redis (optional)
  REDIS_URL: z.string().optional(),

  // Secrets Manager Provider (env, aws, vault)
  SECRETS_PROVIDER: z.enum(["env", "aws", "vault"]).default("env"),

  // CSRF Configuration
  CSRF_SECRET: z.string().default("khademni_csrf_secret_token_key_32chars"),

  // SMTP Configuration (optional — emails logged to console when not set)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z
    .string()
    .default("Khademni <noreply@khademni.com>"),

  // File Storage
  UPLOAD_DIR: z.string().default("./uploads"),

  // Application URLs (for email links)
  APP_URL: z.string().default("http://localhost:3000"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "Invalid environment variables:",
    parsedEnv.error.flatten().fieldErrors,
  );
  process.exit(1);
}

const rawCors = parsedEnv.data.CORS_ORIGIN;
const ALLOWED_CORS_ORIGINS = rawCors
  ? rawCors.split(",").map((origin) => origin.trim()).filter(Boolean)
  : ["http://localhost:5173", "http://localhost:3000"];

export const env = {
  ...parsedEnv.data,
  ALLOWED_CORS_ORIGINS,
};
