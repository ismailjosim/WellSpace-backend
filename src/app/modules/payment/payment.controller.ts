import { type Request, type Response } from 'express'
import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import StatusCode from '@/utils/statusCode'
import { PaymentService } from './payment.service'
import { stripeConfig } from '@/config/stripe.config'
import { envVars } from '@/config/env'

const webhooksSecret = envVars.STRIPE_WEBHOOK_SECRET

const handleStripeWebhookEvent = catchAsync(
	async (req: Request, res: Response) => {
		const sig = req.headers['stripe-signature'] as string

		let event
		try {
			event = stripeConfig.webhooks.constructEvent(
				req.body,
				sig,
				webhooksSecret,
			)
		} catch (err: any) {
			console.error('⚠️ Webhook signature verification failed:', err.message)
			return res.status(400).send(`Webhook Error: ${err.message}`)
		}
		const result = await PaymentService.handleStripeEvent(event)

		sendResponse(res, {
			statusCode: StatusCode.OK,
			success: true,
			message: 'Webhook req send successfully',
			data: result,
		})
	},
)

export const PaymentController = {
	handleStripeWebhookEvent,
}
