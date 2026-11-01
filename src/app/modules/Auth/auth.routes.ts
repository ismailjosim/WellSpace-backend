import { Router } from 'express';
import { AuthControllers } from './auth.controller';
import checkAuth from '../../middlewares/checkAuth';
import { UserRole } from '@prisma/client';
import { authLimiter } from '@/middlewares/rateLimiter';

const router = Router();

router.post('/login', authLimiter, AuthControllers.login);
router.post('/mfa/challenge', authLimiter, AuthControllers.mfaChallenge);
router.post(
  '/mfa/setup',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PATIENT, UserRole.DOCTOR),
  AuthControllers.mfaSetup
);
router.post(
  '/mfa/verify-setup',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PATIENT, UserRole.DOCTOR),
  AuthControllers.mfaVerifySetup
);
router.post(
  '/mfa/disable',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PATIENT, UserRole.DOCTOR),
  AuthControllers.mfaDisable
);
router.post('/refresh-token', authLimiter, AuthControllers.refreshToken);
router.post(
  '/change-password',
  checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PATIENT, UserRole.DOCTOR),
  AuthControllers.changePassword
);
router.post('/forget-password', authLimiter, AuthControllers.forgetPassword);
router.post('/reset-password', authLimiter, AuthControllers.resetPassword);
router.get('/me', AuthControllers.getMe);

export const AuthRoutes = router;
