import { Router } from 'express'
import { UserController } from './user.controller'

const router = Router()

router.post('/create-patient', UserController.createPatient)
router.post('/create-admin', UserController.createAdmin)
router.get('/', UserController.getAllUser)

export const UserRoutes = router
