import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SLOW_QUERY_THRESHOLD_MS: z.coerce.number().min(0).default(300),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32).default('super-secret-access-token-key-change-in-production'),
  JWT_REFRESH_SECRET: z.string().min(32).default('super-secret-refresh-token-key-change-in-production'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsedEnv.data;
