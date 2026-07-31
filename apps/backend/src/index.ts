import { app } from "./app.js";
import { logger } from "./lib/logger.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT} in ${env.NODE_ENV} mode`);
});

// Graceful Shutdown Handler
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Graceful shutdown initiated...");

  server.close(async () => {
    logger.info("HTTP server closed.");
    try {
      await prisma.$disconnect();
      logger.info("Database connection closed.");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error closing database connection");
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if shutdown hangs
  setTimeout(() => {
    logger.error("Forcefully terminating due to shutdown timeout");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled Promise Rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught Exception");
  gracefulShutdown("uncaughtException");
});
