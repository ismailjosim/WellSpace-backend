import { Router } from 'express';
import { DoctorController } from './doctor.controller';
import checkAuth from '@/middlewares/checkAuth';
import { UserRole } from '@prisma/client';
import { fileUploader } from '@/config/multer.config';

const router = Router();

router.get('/', DoctorController.getAllDoctor);
router.post('/suggestion', DoctorController.getAISuggestion);

router.post(
  '/verification/documents',
  checkAuth(UserRole.DOCTOR),
  fileUploader.multiDocUpload.fields([
    { name: 'licenseDocument', maxCount: 1 },
    { name: 'degreeDocument', maxCount: 1 },
  ]),
  DoctorController.uploadVerificationDocuments
);

router.patch(
  '/:id/verification-status',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  DoctorController.updateVerificationStatus
);

router.get('/:id', DoctorController.getSingleDoctorByID);
router.patch(
  '/:id',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  DoctorController.updateProfileInfo
);
router.delete(
  '/:id',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  DoctorController.deleteDoctorByID
);

export const DoctorRoutes = router;
