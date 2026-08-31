import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const INSECURE_DEFAULT_SECRETS = new Set([
  "prod_access_secret_key_minimum_32_characters_long_987",
  "prod_refresh_secret_key_minimum_32_characters_long_987",
  "khademni_csrf_secret_token_key_32chars",
  "recruitment_secure_pass_123",
]);

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:3000,http://localhost:3001"),
    PORT: z.coerce.number().default(3000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
    TRUST_PROXY: z.string().default("loopback"),
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
    FRONTEND_URL: z.string().default("http://localhost:3001"),

    // AI Matching Engine Configuration
    SEMANTIC_PROVIDER: z.enum(["pgvector", "onnx", "tfidf"]).default("pgvector"),
    ONNX_MODEL_NAME: z.string().default("Xenova/all-MiniLM-L6-v2"),
    ONNX_MAX_CHARACTERS: z.coerce.number().default(4096),
    PGVECTOR_DIMENSION: z.coerce.number().default(384),

    // Webhook Security
    BREVO_WEBHOOK_SECRET: z.string().optional(),

    // Database Encryption Key for MFA secrets and OAuth credentials (required in production)
    DATABASE_ENCRYPTION_KEY: z.string().optional(),

    // Seed configuration (required when running db:seed)
    SEED_ADMIN_EMAIL: z.string().email().optional(),
    SEED_ADMIN_PASSWORD: z.string().min(12).optional(),
    SEED_CANDIDATE_PASSWORD: z.string().min(12).optional(),

    // Redis password for requirepass authentication
    REDIS_PASSWORD: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (INSECURE_DEFAULT_SECRETS.has(data.JWT_ACCESS_SECRET)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Insecure default JWT_ACCESS_SECRET detected in production environment.",
          path: ["JWT_ACCESS_SECRET"],
        });
      }
      if (INSECURE_DEFAULT_SECRETS.has(data.JWT_REFRESH_SECRET)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Insecure default JWT_REFRESH_SECRET detected in production environment.",
          path: ["JWT_REFRESH_SECRET"],
        });
      }
      if (INSECURE_DEFAULT_SECRETS.has(data.CSRF_SECRET)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Insecure default CSRF_SECRET detected in production environment.",
          path: ["CSRF_SECRET"],
        });
      }
      if (data.DATABASE_URL.includes("recruitment_secure_pass_123")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Insecure default database password detected in production DATABASE_URL.",
          path: ["DATABASE_URL"],
        });
      }
      if (!data.SMTP_HOST || !data.SMTP_USER || !data.SMTP_PASS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Production environment requires complete SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASS).",
          path: ["SMTP_HOST"],
        });
      }
      if (!data.BREVO_WEBHOOK_SECRET || data.BREVO_WEBHOOK_SECRET.length < 16) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Production environment requires BREVO_WEBHOOK_SECRET (min 16 chars) for webhook HMAC validation.",
          path: ["BREVO_WEBHOOK_SECRET"],
        });
      }
      if (!data.DATABASE_ENCRYPTION_KEY || data.DATABASE_ENCRYPTION_KEY.length < 64) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Production environment requires DATABASE_ENCRYPTION_KEY (64 hex chars = 32 bytes) for AES-256-GCM encryption.",
          path: ["DATABASE_ENCRYPTION_KEY"],
        });
      }
      const hasEmbeddedRedisAuth =
        !!data.REDIS_URL &&
        (data.REDIS_URL.includes("@") || data.REDIS_URL.startsWith("rediss://"));
      if (!hasEmbeddedRedisAuth && (!data.REDIS_PASSWORD || data.REDIS_PASSWORD.length < 16)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Production environment requires REDIS_PASSWORD (min 16 chars) or an authenticated REDIS_URL for Redis authentication.",
          path: ["REDIS_PASSWORD"],
        });
      }
    }
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
const initialOrigins = rawCors
  ? rawCors.split(",").map((origin) => origin.trim().replace(/\/$/, "")).filter(Boolean)
  : ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"];

const additionalOrigins = [
  parsedEnv.data.FRONTEND_URL?.trim().replace(/\/$/, ""),
  parsedEnv.data.APP_URL?.trim().replace(/\/$/, ""),
].filter(Boolean) as string[];

const ALLOWED_CORS_ORIGINS = Array.from(
  new Set([...initialOrigins, ...additionalOrigins]),
);

export const env = {
  ...parsedEnv.data,
  ALLOWED_CORS_ORIGINS,
};

