import { prisma } from '@/config/prisma.config'
import { AppointmentStatus, PaymentStatus } from '@prisma/client'
import type Stripe from 'stripe'

const handleStripeEvent = async (event: Stripe.Event): Promise<void> => {
	switch (event.type) {
		case 'checkout.session.completed': {
			const session = event.data.object as Stripe.Checkout.Session

			if (!session) return
			console.log('✅ Checkout session completed:', session.id)

			const email = session.customer_email ?? undefined
			const amount = session.amount_total ? session.amount_total / 100 : 0

			if (!email) {
				console.warn('⚠️ No email found in checkout session')
				return
			}

			// ✅ Update payment record by matching user + amount
			await prisma.payment.updateMany({
				where: {
					appointment: {
						patient: {
							email,
						},
					},
					amount,
				},
				data: {
					status: 'PAID',
					transactionId:
						typeof session.payment_intent === 'string'
							? session.payment_intent
							: session.payment_intent?.toString() || '',
				},
			})

			// ✅ Optionally, confirm the related appointment
			await prisma.appointment.updateMany({
				where: {
					patient: {
						email,
					},
				},
				data: {
					status: AppointmentStatus.SCHEDULED,
				},
			})

			break
		}

		case 'checkout.session.expired': {
			const session = event.data.object as Stripe.Checkout.Session
			if (!session) return

			console.log('⚠️ Checkout session expired:', session.id)

			const paymentIntentId =
				typeof session.payment_intent === 'string'
					? session.payment_intent
					: session.payment_intent?.toString() || null

			if (!paymentIntentId) return

			await prisma.payment.updateMany({
				where: { transactionId: paymentIntentId },
				data: { status: PaymentStatus.UNPAID },
			})
			break
		}

		default:
			console.log(`⚠️ Unhandled event type: ${event.type}`)
	}
}

export const PaymentService = {
	handleStripeEvent,
}
