import { Router } from 'express'
import { UserRoutes } from '@/modules/User/user.routes'
import { AuthRoutes } from '@/modules/Auth/auth.routes'
import { ScheduleRoutes } from '@/modules/schedule/schedule.routes'
import { DoctorScheduleRoutes } from '@/modules/doctorSchedule/doctorSchedule.routes'
const router = Router()

const moduleRoutes = [
	{
		path: '/user',
		route: UserRoutes,
	},
	{
		path: '/auth',
		route: AuthRoutes,
	},
	{
		path: '/schedule',
		route: ScheduleRoutes,
	},
	{
		path: '/doctor-schedule',
		route: DoctorScheduleRoutes,
	},
]

moduleRoutes.forEach((route) => router.use(route.path, route.route))

export default router
