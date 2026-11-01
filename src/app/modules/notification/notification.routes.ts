import { Router } from 'express';
import { UserRole } from '@prisma/client';
import checkAuth from '@/middlewares/checkAuth';
import { NotificationController } from './notification.controller';

const router = Router();

router.get(
  '/',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR, UserRole.PATIENT),
  NotificationController.getMyNotifications
);

router.get(
  '/stream',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR, UserRole.PATIENT),
  NotificationController.streamMyNotifications
);

router.patch(
  '/read-all',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR, UserRole.PATIENT),
  NotificationController.markAllNotificationsAsRead
);

router.patch(
  '/:id/read',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR, UserRole.PATIENT),
  NotificationController.markNotificationAsRead
);

export const NotificationRoutes = router;
