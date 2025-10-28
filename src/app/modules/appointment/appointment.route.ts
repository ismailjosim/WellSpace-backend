import { Router } from 'express'
import { AppointmentController } from './appointment.controller'
import { UserRole } from '@prisma/client'
import checkAuth from '@/middlewares/checkAuth'

const router = Router()

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

export const AppointmentRoutes = router
