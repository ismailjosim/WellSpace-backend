import { Router } from 'express'
import { AuthControllers } from './auth.controller'

const router = Router()

router.post('/login', AuthControllers.login)
router.post('/refresh-token', AuthControllers.refreshToken)
router.post('/change-password', AuthControllers.changePassword)
router.post('/forget-password', AuthControllers.forgetPassword)
router.post('/set-password', AuthControllers.setPassword)

export const AuthRoutes = router
