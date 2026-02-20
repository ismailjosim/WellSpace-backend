import { Router } from 'express'
import { DoctorScheduleController } from './doctorSchedule.controller'
import checkAuth from '@/middlewares/checkAuth'
import { UserRole } from '@prisma/client'
import validateRequest from '@/middlewares/validateRequest'
import { DoctorScheduleValidation } from './doctorSchedule.validation'

const router = Router()

/**
 * API ENDPOINT: /doctor-schedule/
 *
 * Get all doctor schedule with filtering
 */

router.post(
	'/',
	validateRequest(
		DoctorScheduleValidation.createDoctorScheduleValidationSchema,
	),
	checkAuth(UserRole.DOCTOR),
	DoctorScheduleController.createDoctorSchedule,
)

router.get(
	'/',
	checkAuth(
		UserRole.SUPER_ADMIN,
		UserRole.ADMIN,
		UserRole.DOCTOR,
		UserRole.PATIENT,
	),
	DoctorScheduleController.getAllDoctorSchedules,
)

router.get(
	'/my-schedule',
	checkAuth(UserRole.DOCTOR),
	DoctorScheduleController.getMySchedule,
)

router.delete(
	'/:id',
	checkAuth(UserRole.DOCTOR),
	DoctorScheduleController.deleteDoctorScheduleById,
)

export const DoctorScheduleRoutes = router
