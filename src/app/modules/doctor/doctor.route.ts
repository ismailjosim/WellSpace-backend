import { Router } from 'express'
import { DoctorController } from './doctor.controller'
import checkAuth from '@/middlewares/checkAuth'
import { UserRole } from '@prisma/client'

const router = Router()

router.get(
	'/',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
	DoctorController.getAllDoctor,
)
router.post('/suggestion', DoctorController.getAISuggestion)

router.get(
	'/:id',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
	DoctorController.getSingleDoctorByID,
)
router.patch(
	'/:id',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
	DoctorController.updateProfileInfo,
)
router.delete(
	'/:id',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
	DoctorController.deleteDoctorByID,
)

export const DoctorRoutes = router
