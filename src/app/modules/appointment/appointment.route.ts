import { Router } from 'express'
import { AppointmentController } from './appointment.controller'
import validateRequest from '@/middlewares/validateRequest'
import { AppointmentValidation } from './appointment.validation'
import { UserRole } from '@prisma/client'
import checkAuth from '@/middlewares/checkAuth'

const router = Router()

router.post(
	'/',
	// validateRequest(AppointmentValidation.createAppointmentValidationSchema),
	checkAuth(UserRole.PATIENT),
	AppointmentController.createAppointment,
)

export const AppointmentRoutes = router
