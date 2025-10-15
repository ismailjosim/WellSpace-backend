import { Router } from 'express'
import { DoctorScheduleController } from './doctorSchedule.controller'
import checkAuth from '@/middlewares/checkAuth'
import { UserRole } from '@prisma/client'

const router = Router()

router.post(
	'/',
	checkAuth(UserRole.DOCTOR),
	DoctorScheduleController.createDoctorSchedule,
)
// router.get('/', ScheduleController.getScheduleForDoctor)
// router.delete('/delete-range', ScheduleController.deleteDateRangeSchedule)
// router.delete('/:id', ScheduleController.deleteSchedule)

export const DoctorScheduleRoutes = router
