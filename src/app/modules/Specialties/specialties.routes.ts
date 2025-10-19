import { Router } from 'express'
import { SpecialtiesController } from './specialties.controller'
import { SpecialtiesValidation } from './specialties.validation'
import validateRequest from '@/middlewares/validateRequest'
import { fileUploader } from '@/config/multer.config'

const router = Router()

router.post(
	'/',
	fileUploader.multerUpload.single('file'),
	validateRequest(SpecialtiesValidation.createSpecialtyValidationSchema),
	SpecialtiesController.createSpecialty,
)
router.get('/', SpecialtiesController.getAllSpecialties)
router.delete('/:id', SpecialtiesController.deleteSpecialty)

export const SpecialtiesRoutes = router
