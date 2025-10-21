import { Router } from 'express'
import { DoctorController } from './doctor.controller'

const router = Router()

router.get('/', DoctorController.getAllDoctor)
router.patch('/:id', DoctorController.updateProfileInfo)

export const DoctorRoutes = router
