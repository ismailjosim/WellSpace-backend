import { Router } from 'express';
import { PatientController } from './patient.controller';
import checkAuth from '../../middlewares/checkAuth';
import { UserRole } from '@prisma/client';
import { fileUploader } from '@/config/multer.config';

const router = Router();

router.get('/', checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN), PatientController.getAllPatients);
router.get('/me/health-record', checkAuth(UserRole.PATIENT), PatientController.getMyHealthRecord);
router.patch(
  '/me/health-data',
  checkAuth(UserRole.PATIENT),
  PatientController.updateMyHealthData
);
router.post(
  '/me/medical-reports',
  checkAuth(UserRole.PATIENT),
  fileUploader.multerUpload.single('file'),
  PatientController.createMyMedicalReport
);
router.delete(
  '/me/medical-reports/:reportId',
  checkAuth(UserRole.PATIENT),
  PatientController.deleteMyMedicalReport
);
router.get('/:id', PatientController.getPatientByID);
router.patch(
  '/:id',
  checkAuth(UserRole.PATIENT, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR),
  PatientController.updatePatientInfoByID
);
router.delete(
  '/:id',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  PatientController.deletePatientByID
);

export const PatientRoutes = router;
