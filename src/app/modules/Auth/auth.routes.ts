import { Router } from 'express';
import { AuthControllers } from './auth.controller';
import checkAuth from '../../middlewares/checkAuth';
import { UserRole } from '@prisma/client';
import { authLimiter } from '@/middlewares/rateLimiter';

const router = Router();

router.post('/login', authLimiter, AuthControllers.login);
router.post('/refresh-token', authLimiter, AuthControllers.refreshToken);
router.post(
  '/change-password',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PATIENT, UserRole.DOCTOR),
  AuthControllers.changePassword
);
router.post('/forget-password', authLimiter, AuthControllers.forgetPassword);
router.post(
  '/reset-password',
  authLimiter,
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PATIENT, UserRole.DOCTOR),
  AuthControllers.resetPassword
);
router.get('/me', AuthControllers.getMe);

export const AuthRoutes = router;
