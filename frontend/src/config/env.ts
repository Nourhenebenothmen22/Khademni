import { z } from "zod";

const frontendEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_API_URL: z.string().url("Valid NEXT_PUBLIC_API_URL is required").default("http://localhost:3000/api/v1"),
});

function validateEnvVariables() {
  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1",
  };

  const parsed = frontendEnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.error(
      "[FRONTEND CONFIG ERROR] Invalid frontend environment variables:",
      parsed.error.flatten().fieldErrors,
    );
    return rawEnv as z.infer<typeof frontendEnvSchema>;
  }

  return parsed.data;
}

export const env = validateEnvVariables();
