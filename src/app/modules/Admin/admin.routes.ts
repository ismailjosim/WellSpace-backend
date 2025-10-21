import { Router } from 'express'
import { AdminController } from './admin.controller'

const router = Router()

router.get('/', AdminController.getAllAdmin)
router.get('/:id', AdminController.getSingleAdminByID)
router.patch('/:id', AdminController.updateAdminInfo)

export const AdminRoutes = router

/*
 * admin features
 * Implement get all admins with pagination, filtering, searching, and sorting.
 * Implement get admin by ID functionality.
 * Implement update admin by ID functionality.
 * Implement delete admin by ID functionality.
 */
