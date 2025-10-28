import { Router } from 'express'
import { PrescriptionController } from './prescription.controller'
import checkAuth from '@/middlewares/checkAuth'
import { UserRole } from '@prisma/client'

const router = Router()

router.post(
	'/',
	checkAuth(UserRole.DOCTOR),
	PrescriptionController.createPrescription,
)

// Single route for both patients and doctors
router.get(
	'/my-prescriptions',
	checkAuth(UserRole.PATIENT, UserRole.DOCTOR),
	PrescriptionController.getMyPrescriptions,
)

export const PrescriptionRoutes = router
