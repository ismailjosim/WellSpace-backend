import { Router } from 'express'
import { UserController } from './user.controller'

const router = Router()

router.post('/create', UserController.createAdmin)
router.get('/', UserController.getAllUser)

export const UserRoutes = router
