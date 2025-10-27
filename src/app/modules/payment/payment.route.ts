import { Router } from 'express'
import { PaymentController } from './payment.controller'
// import validateRequest from '@/middlewares/validateRequest';
// import checkAuth from '@/middlewares/checkAuth';
// import { UserRole } from '@prisma/client';

const router = Router()

router.post(
	'/webhook',
	// validateRequest(PaymentValidation.createPaymentValidationSchema),
	// checkAuth(UserRole.DOCTOR), // Uncomment if needed
	PaymentController.handleWebhook,
)

export const PaymentRoutes = router
