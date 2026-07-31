import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

interface AuditLogInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Creates an audit log entry in the database.
 * Fire-and-forget: errors are logged but never thrown to the caller.
 */
export function logAuditAction(input: AuditLogInput): void {
  prisma.auditLog
    .create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ?? undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    })
    .then(() => {
      logger.debug(
        { action: input.action, entityType: input.entityType },
        "Audit log created",
      );
    })
    .catch((error) => {
      logger.error(
        { error, action: input.action },
        "Failed to create audit log",
      );
    });
}
