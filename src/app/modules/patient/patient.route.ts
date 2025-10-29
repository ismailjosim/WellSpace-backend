import { Router } from 'express'
import { PatientController } from './patient.controller'
import checkAuth from '../../middlewares/checkAuth'
import { UserRole } from '@prisma/client'

const router = Router()

router.get(
	'/',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
	PatientController.getAllPatients,
)
router.get('/:id', PatientController.getPatientByID)
router.patch(
	'/',
	checkAuth(UserRole.PATIENT),
	PatientController.updatePatientInfoByID,
)
router.delete(
	'/:id',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
	PatientController.deletePatientByID,
)

export const PatientRoutes = router
