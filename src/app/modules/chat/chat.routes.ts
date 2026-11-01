import { Router } from 'express';
import { ChatController } from './chat.controller';
import checkAuth from '@/middlewares/checkAuth';
import { UserRole } from '@prisma/client';

const router = Router();

router.get(
  '/:appointmentId',
  checkAuth(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  ChatController.getChatRoom
);

router.post(
  '/:appointmentId/messages',
  checkAuth(UserRole.PATIENT, UserRole.DOCTOR),
  ChatController.sendMessage
);

router.patch(
  '/:appointmentId/read',
  checkAuth(UserRole.PATIENT, UserRole.DOCTOR),
  ChatController.markAsRead
);

export const ChatRoutes = router;
