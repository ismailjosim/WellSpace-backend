import { Router } from 'express'
import { AppointmentController } from './appointment.controller'
import validateRequest from '@/middlewares/validateRequest'
// import checkAuth from '@/middlewares/checkAuth';
// import { UserRole } from '@prisma/client';

const router = Router()

router.post(
	'/',
	validateRequest(AppointmentValidation.createAppointmentValidationSchema),
	// checkAuth(UserRole.DOCTOR), // Uncomment if needed
	AppointmentController.createAppointment,
)

export const AppointmentRoutes = router
