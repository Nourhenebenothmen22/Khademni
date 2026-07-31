import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import type { Prisma } from "../generated/prisma/client.js";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

const prismaClient = new PrismaClient({
  adapter,
  log: [{ level: "query", emit: "event" }],
});

function parseTarget(target: string): { model: string; action: string } {
  const parts = target.split("::");
  const last = parts[parts.length - 1] ?? target;
  const dotIndex = last.lastIndexOf(".");
  if (dotIndex === -1) {
    return { model: last, action: "query" };
  }
  return {
    model: last.slice(0, dotIndex),
    action: last.slice(dotIndex + 1),
  };
}

prismaClient.$on("query", (event: Prisma.QueryEvent) => {
  const { model, action } = parseTarget(event.target);
  const { query, params, duration } = event;
  const threshold = env.SLOW_QUERY_THRESHOLD_MS;

  const logData: Record<string, unknown> = {
    model,
    action,
    duration: Math.round(duration),
  };

  if (env.NODE_ENV === "development") {
    logData.query = query;
    logData.params = params;
  }

  if (duration >= threshold) {
    logger.warn(logData, "slow query");
  } else {
    logger.debug(logData, "query");
  }
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClient;

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
