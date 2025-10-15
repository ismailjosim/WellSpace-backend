import { Router } from 'express'
import { UserRoutes } from '@/modules/User/user.routes'
import { AuthRoutes } from '@/modules/Auth/auth.routes'
import { ScheduleRoutes } from '@/modules/schedule/schedule.routes'
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
]

moduleRoutes.forEach((route) => router.use(route.path, route.route))

export default router
