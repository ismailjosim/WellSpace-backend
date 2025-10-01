import { Router } from 'express'
import { AdminController } from './admin.controller'

const router = Router()

router.get('/', AdminController.getAllAdmin)

export const AdminRoutes = router
