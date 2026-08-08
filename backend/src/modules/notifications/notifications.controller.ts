import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../common/middlewares/auth.middleware.js';
import * as notificationsService from './notifications.service.js';

export async function getNotificationsController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await notificationsService.getUserNotifications(
      req.user!.userId,
      req.query as unknown as Record<string, unknown>,
    );
    res.status(200).json({ success: true, data: result.items, meta: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCountController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await notificationsService.getUnreadCount(req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function markAsReadController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const result = await notificationsService.markAsRead(
      id,
      req.user!.userId,
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function markAllAsReadController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await notificationsService.markAllAsRead(req.user!.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function deleteNotificationController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const result = await notificationsService.deleteNotification(
      id,
      req.user!.userId,
    );
    res.status(200).json({ success: true, data: { message: result.message } });
  } catch (error) {
    next(error);
  }
}
