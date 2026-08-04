import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../common/errors/app-error.js';
import { logger } from '../../lib/logger.js';
import type { NotificationQuery } from '../../common/validators/notification.validators.js';

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    return await prisma.notification.create({
      data: {
        ...input,
        metadata: input.metadata ? (input.metadata as any) : undefined,
      },
    });
  } catch (error) {
    logger.error({ error, userId: input.userId }, 'Failed to create notification');
    return null;
  }
}

export async function getUserNotifications(userId: string, query: NotificationQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = { userId };
  if (query.isRead !== undefined) whereClause.isRead = query.isRead;
  if (query.type) whereClause.type = query.type;

  const [total, items] = await Promise.all([
    prisma.notification.count({ where: whereClause }),
    prisma.notification.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
    }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return { count };
}

export async function markAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) throw new AppError('Notification not found.', 404);

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { updated: result.count };
}

export async function deleteNotification(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) throw new AppError('Notification not found.', 404);

  await prisma.notification.delete({ where: { id: notificationId } });
  return { message: 'Notification deleted successfully.' };
}
