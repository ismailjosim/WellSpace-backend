import { Router } from 'express'
import { UserController } from './user.controller'
import validateRequest from '@/middlewares/validateRequest'
import { UserValidationSchema } from './user.validation'
import { fileUploader } from '@/config/multer.config'

const router = Router()

router.post(
	'/create-patient',
	fileUploader.multerUpload.single('file'),
	validateRequest(UserValidationSchema.createPatientValidationSchema),
	UserController.createPatient,
)
router.post(
	'/create-admin',
	fileUploader.multerUpload.single('file'),
	validateRequest(UserValidationSchema.createAdminValidationSchema),
	UserController.createAdmin,
)
router.post(
	'/create-doctor',
	fileUploader.multerUpload.single('file'),
	validateRequest(UserValidationSchema.createDoctorValidationSchema),
	UserController.createDoctor,
)
router.get('/', UserController.getAllUser)

export const UserRoutes = router
