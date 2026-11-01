import { Router } from 'express';
import checkAuth from '@/middlewares/checkAuth';
import { UserRole } from '@prisma/client';
import { SettingsController } from './settings.controller';

const router = Router();

router.get('/public', SettingsController.getPublicSettings);
router.get(
  '/admin',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  SettingsController.getAllSettings
);
router.patch(
  '/admin',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  SettingsController.updateSettings
);

export const SettingsRoutes = router;
