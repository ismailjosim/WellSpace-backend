import { Router } from 'express'
import { SpecialtiesController } from './specialties.controller'
import { SpecialtiesValidation } from './specialties.validation'
import validateRequest from '@/middlewares/validateRequest'
import { fileUploader } from '@/config/multer.config'
import checkAuth from '@/middlewares/checkAuth'
import { UserRole } from '@prisma/client'

const router = Router()

router.post(
	'/',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
	fileUploader.multerUpload.single('file'),
	validateRequest(SpecialtiesValidation.createSpecialtyValidationSchema),
	SpecialtiesController.createSpecialty,
)
router.get(
	'/',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DOCTOR),
	SpecialtiesController.getAllSpecialties,
)
router.delete(
	'/:id',
	checkAuth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
	SpecialtiesController.deleteSpecialty,
)

export const SpecialtiesRoutes = router
