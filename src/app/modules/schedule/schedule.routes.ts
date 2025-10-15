import { Router } from 'express'
import { ScheduleController } from './schedule.controller'
import checkAuth from '@/middlewares/checkAuth'
import { UserRole } from '@prisma/client'

const router = Router()

router.post('/', ScheduleController.createSchedule)
router.get(
	'/',
	checkAuth(UserRole.ADMIN, UserRole.DOCTOR),
	ScheduleController.getScheduleForDoctor,
)
router.delete('/delete-range', ScheduleController.deleteDateRangeSchedule)
router.delete('/:id', ScheduleController.deleteSchedule)

export const ScheduleRoutes = router
