import { Router } from 'express';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import {
  validateQuery,
  validateParams,
} from '../../common/middlewares/validate.middleware.js';
import {
  notificationQuerySchema,
  notificationParamsSchema,
} from '../../common/validators/notification.validators.js';
import * as notificationsController from './notifications.controller.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  validateQuery(notificationQuerySchema),
  notificationsController.getNotificationsController,
);

router.get('/unread-count', notificationsController.getUnreadCountController);

router.patch(
  '/:id/read',
  validateParams(notificationParamsSchema),
  notificationsController.markAsReadController,
);

router.patch('/read-all', notificationsController.markAllAsReadController);

router.delete(
  '/:id',
  validateParams(notificationParamsSchema),
  notificationsController.deleteNotificationController,
);

export { router as notificationsRouter };
