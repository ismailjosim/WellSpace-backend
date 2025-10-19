import { Router } from 'express'
import { DoctorController } from './doctor.controller'
import validateRequest from '@/middlewares/validateRequest'
// import checkAuth from '@/middlewares/checkAuth';
// import { UserRole } from '@prisma/client';

const router = Router()

router.get('/', DoctorController.getAllDoctor)
export const DoctorRoutes = router
