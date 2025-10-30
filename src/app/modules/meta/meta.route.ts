import { Router } from 'express'
import { MetaController } from './meta.controller'
import checkAuth from '@/middlewares/checkAuth'
import { UserRole } from '@prisma/client'

const router = Router()

router.get(
	'/',
	checkAuth(
		UserRole.DOCTOR,
		UserRole.ADMIN,
		UserRole.PATIENT,
		UserRole.SUPER_ADMIN,
	),
	MetaController.fetchDashboardMetaData,
)

export const MetaRoutes = router
