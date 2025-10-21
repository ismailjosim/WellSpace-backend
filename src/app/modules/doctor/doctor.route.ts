import { Router } from 'express'
import { DoctorController } from './doctor.controller'

const router = Router()

router.get('/', DoctorController.getAllDoctor)
router.get('/:id', DoctorController.getSingleDoctorByID)
router.patch('/:id', DoctorController.updateProfileInfo)
router.delete('/:id', DoctorController.deleteDoctorByID)

export const DoctorRoutes = router
