import { type Request, type Response } from 'express'
import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import StatusCode from '@/utils/statusCode'
import { PaymentService } from './payment.service'
import { stripeConfig } from '@/config/stripe.config'

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
	let event

	try {
		const sig = req.headers['stripe-signature'] as string

		if (endpointSecret) {
			event = stripeConfig.webhooks.constructEvent(
				req.body,
				sig,
				endpointSecret,
			)
		} else {
			event = req.body
		}
	} catch (err: any) {
		console.error('⚠️  Webhook signature verification failed:', err.message)
		return sendResponse(res, {
			statusCode: StatusCode.BAD_REQUEST,
			success: false,
			message: `Webhook Error: ${err.message}`,
		})
	}

	await PaymentService.handleStripeEvent(event)

	sendResponse(res, {
		statusCode: StatusCode.OK,
		success: true,
		message: 'Webhook event received successfully!',
		data: { received: true },
	})
})

export const PaymentController = {
	handleWebhook,
}
