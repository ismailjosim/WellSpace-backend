import { Router } from 'express'
import { ScheduleController } from './schedule.controller'

const router = Router()

router.post('/', ScheduleController.createSchedule)
router.get('/', ScheduleController.getScheduleForDoctor)
router.delete('/delete-range', ScheduleController.deleteDateRangeSchedule)
router.delete('/:id', ScheduleController.deleteSchedule)

export const ScheduleRoutes = router
