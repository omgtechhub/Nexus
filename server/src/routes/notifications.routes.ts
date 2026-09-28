import { Router } from 'express';
import { getNotifications, markNotificationRead, markAllRead } from '../controllers/notifications.controller.js';
import { authMiddleware, requireStoreMembership } from '../middleware/auth.middleware.js';

export const notificationsRouter = Router();

notificationsRouter.use(authMiddleware);
notificationsRouter.use(requireStoreMembership);

notificationsRouter.get('/', getNotifications);
notificationsRouter.patch('/read-all', markAllRead);
notificationsRouter.patch('/:id/read', markNotificationRead);
