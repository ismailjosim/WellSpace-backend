import { Router } from 'express';
import { ConsultationController } from './consultation.controller';
import checkAuth from '@/middlewares/checkAuth';
import { UserRole } from '@prisma/client';

const router = Router();

router.get(
  '/:appointmentId',
  checkAuth(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  ConsultationController.getSession
);

router.post(
  '/:appointmentId/end',
  checkAuth(UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  ConsultationController.endSession
);

router.patch(
  '/:appointmentId/notes',
  checkAuth(UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  ConsultationController.saveNotes
);

export const ConsultationRoutes = router;
