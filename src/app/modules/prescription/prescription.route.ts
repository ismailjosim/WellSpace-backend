import { Router } from 'express';
import { PrescriptionController } from './prescription.controller';
import checkAuth from '@/middlewares/checkAuth';
import { UserRole } from '@prisma/client';

const router = Router();

router.post('/', checkAuth(UserRole.DOCTOR), PrescriptionController.createPrescription);

// Single route for both patients and doctors
router.get(
  '/my-prescriptions',
  checkAuth(UserRole.PATIENT, UserRole.DOCTOR),
  PrescriptionController.getMyPrescriptions
);

router.get('/my-followups', checkAuth(UserRole.PATIENT), PrescriptionController.getMyFollowUps);

router.get(
  '/doctor/due-followups',
  checkAuth(UserRole.DOCTOR),
  PrescriptionController.getDoctorDueFollowUps
);

router.post(
  '/:id/book-followup',
  checkAuth(UserRole.PATIENT),
  PrescriptionController.bookFollowUpAppointment
);

router.get(
  '/:id',
  checkAuth(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  PrescriptionController.getSinglePrescription
);

export const PrescriptionRoutes = router;
