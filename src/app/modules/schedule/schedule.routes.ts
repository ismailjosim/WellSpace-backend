import { Router } from 'express'
import { ScheduleController } from './schedule.controller'

const router = Router()

router.post('/', ScheduleController.createSchedule)

export const ScheduleRoutes = router
