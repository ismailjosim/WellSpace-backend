import { Router } from 'express'
import { SpecialtiesController } from './specialties.controller'

const router = Router()

router.post('/', SpecialtiesController.createSpecialty)
router.get('/', SpecialtiesController.getAllSpecialties)

export const SpecialtiesRoutes = router
