import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import type { Prisma } from "../generated/prisma/client.js";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

const basePrisma = new PrismaClient({
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

basePrisma.$on("query", (event: Prisma.QueryEvent) => {
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

const extendedPrisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        let retries = 3;
        while (retries > 0) {
          try {
            return await query(args);
          } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            const isTransient =
              errorMsg.includes("Connection terminated unexpectedly") ||
              errorMsg.includes("Connection closed") ||
              errorMsg.includes("closed unexpectedly") ||
              errorMsg.includes("timed out");

            if (retries > 1 && isTransient) {
              retries--;
              logger.warn({ errorMsg, retriesLeft: retries }, "Retrying transient database query");
              await new Promise((r) => setTimeout(r, 300));
              continue;
            }
            throw err;
          }
        }
      },
    },
  },
});

const globalForPrisma = globalThis as unknown as {
  prisma: typeof extendedPrisma | undefined;
};

export const prisma = (globalForPrisma.prisma ?? extendedPrisma) as unknown as PrismaClient;

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = extendedPrisma;
}
