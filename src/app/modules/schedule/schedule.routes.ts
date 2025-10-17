import { Router } from 'express'
import { ScheduleController } from './schedule.controller'
import checkAuth from '@/middlewares/checkAuth'
import { UserRole } from '@prisma/client'
import validateRequest from '../../middlewares/validateRequest'
import { ScheduleValidation } from './schedule.validation'

const router = Router()

router.post(
	'/',
	validateRequest(ScheduleValidation.createScheduleValidationSchema),
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
	ScheduleController.createSchedule,
)

router.get(
	'/',
	checkAuth(UserRole.ADMIN, UserRole.DOCTOR),
	ScheduleController.getScheduleForDoctor,
)

router.delete(
	'/delete-range',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
	ScheduleController.deleteDateRangeSchedule,
)

router.delete(
	'/:id',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
	ScheduleController.deleteSchedule,
)

export const ScheduleRoutes = router
