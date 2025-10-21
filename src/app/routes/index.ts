import { Router } from 'express'
import { UserRoutes } from '@/modules/User/user.routes'
import { AuthRoutes } from '@/modules/Auth/auth.routes'
import { ScheduleRoutes } from '@/modules/schedule/schedule.routes'
import { DoctorScheduleRoutes } from '@/modules/doctorSchedule/doctorSchedule.routes'
import { SpecialtiesRoutes } from '@/modules/Specialties/specialties.routes'
import { DoctorRoutes } from '@/modules/doctor/doctor.route'
import { PatientRoutes } from '@/modules/patient/patient.route'
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
	{
		path: '/specialties',
		route: SpecialtiesRoutes,
	},
	{
		path: '/doctor',
		route: DoctorRoutes,
	},
	{
		path: '/patient',
		route: PatientRoutes,
	},
]

moduleRoutes.forEach((route) => router.use(route.path, route.route))

export default router
