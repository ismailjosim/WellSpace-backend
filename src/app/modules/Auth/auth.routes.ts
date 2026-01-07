import { Router } from 'express'
import { AuthControllers } from './auth.controller'
import checkAuth from '../../middlewares/checkAuth'
import { UserRole } from '@prisma/client'

const router = Router()

router.post('/login', AuthControllers.login)
router.post('/refresh-token', AuthControllers.refreshToken)
router.post(
	'/change-password',
	checkAuth(
		UserRole.ADMIN,
		UserRole.SUPER_ADMIN,
		UserRole.PATIENT,
		UserRole.DOCTOR,
	),
	AuthControllers.changePassword,
)
router.post('/forget-password', AuthControllers.forgetPassword)
router.post(
	'/reset-password',
	checkAuth(
		UserRole.ADMIN,
		UserRole.SUPER_ADMIN,
		UserRole.PATIENT,
		UserRole.DOCTOR,
	),
	AuthControllers.resetPassword,
)
router.get('/me', AuthControllers.getMe)

export const AuthRoutes = router
