import { Router } from 'express'
import { UserController } from './user.controller'
import validateRequest from '@/middlewares/validateRequest'
import { UserValidationSchema } from './user.validation'
import { fileUploader } from '@/config/multer.config'
import checkAuth from '@/middlewares/checkAuth'
import { UserRole } from '@prisma/client'

const router = Router()

router.post(
	'/create-patient',
	fileUploader.multerUpload.single('file'),
	validateRequest(UserValidationSchema.createPatientValidationSchema),
	UserController.createPatient,
)
router.post(
	'/create-admin',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
	fileUploader.multerUpload.single('file'),
	validateRequest(UserValidationSchema.createAdminValidationSchema),
	UserController.createAdmin,
)
router.post(
	'/create-doctor',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
	fileUploader.multerUpload.single('file'),
	validateRequest(UserValidationSchema.createDoctorValidationSchema),
	UserController.createDoctor,
)
router.get(
	'/',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PATIENT),
	UserController.getAllUser,
)

export const UserRoutes = router
