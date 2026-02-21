import { Router } from 'express'
import { AppointmentController } from './appointment.controller'
import { UserRole } from '@prisma/client'
import checkAuth from '@/middlewares/checkAuth'
import validateRequest from '../../middlewares/validateRequest'
import { AppointmentValidation } from './appointment.validation'
import { paymentLimiter } from '../../middlewares/rateLimiter'

const router = Router()

router.get(
	'/',
	checkAuth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
	AppointmentController.getAllAppointments,
)

router.get(
	'/my-appointment',
	checkAuth(UserRole.PATIENT, UserRole.DOCTOR),
	AppointmentController.getMyAppointment,
)

router.post(
	'/',
	checkAuth(UserRole.PATIENT),
	AppointmentController.createAppointment,
)

router.post(
	'/pay-later',
	checkAuth(UserRole.PATIENT),
	validateRequest(AppointmentValidation.createAppointmentValidationSchema),
	AppointmentController.createAppointmentWithPayLater,
)

router.post(
	'/:id/initiate-payment',
	checkAuth(UserRole.PATIENT),
	paymentLimiter,
	AppointmentController.initiatePayment,
)

router.patch(
	'/status/:appointmentId',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR),
	AppointmentController.updateAppointmentStatus,
)

export const AppointmentRoutes = router
