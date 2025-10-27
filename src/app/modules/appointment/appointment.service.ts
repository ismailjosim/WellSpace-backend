import { prisma } from '@/config/prisma.config'
import type { JwtPayload } from 'jsonwebtoken'
import AppError from '../../helpers/AppError'
import StatusCode from '../../utils/statusCode'
import { v4 as uuidv4 } from 'uuid'
import { stripeConfig } from '../../config/stripe.config'
import { envVars } from '../../config/env'

const createAppointmentIntoDB = async (
	user: JwtPayload,
	payload: { doctorId: string; scheduleId: string },
) => {
	// find patient
	const patientData = await prisma.patient.findUniqueOrThrow({
		where: {
			email: user.email,
		},
	})

	// find doctor
	const doctorData = await prisma.doctor.findUniqueOrThrow({
		where: {
			id: payload.doctorId,
			isDeleted: false,
		},
	})

	const isBooked = await prisma.doctorSchedule.findFirstOrThrow({
		where: {
			doctorId: payload.doctorId,
			scheduleId: payload.scheduleId,
			isBooked: false,
		},
	})
	const videoCallingId = uuidv4()
	// Implement DB logic here
	const appointmentData = {
		patientId: patientData.id,
		doctorId: doctorData.id,
		scheduleId: payload.scheduleId,
		videoCallingId,
	}

	const result = await prisma.$transaction(async (tnx) => {
		const appointmentResult = await tnx.appointment.create({
			data: appointmentData,
		})
		await tnx.doctorSchedule.update({
			where: {
				doctorId_scheduleId: {
					doctorId: doctorData.id,
					scheduleId: payload.scheduleId,
				},
			},
			data: {
				isBooked: true,
			},
		})

		// payment options
		const transactionId = uuidv4()
		await tnx.payment.create({
			data: {
				appointmentId: appointmentResult.id,
				amount: doctorData.appointmentFee,
				transactionId,
			},
		})

		const session = stripeConfig.checkout.sessions.create({
			payment_method_types: ['card'],
			mode: 'payment',
			customer_email: user.email,
			line_items: [
				{
					price_data: {
						currency: 'usd',
						product_data: {
							name: `Appointment With ${doctorData.name}`,
						},
						unit_amount: doctorData.appointmentFee * 100,
					},
					quantity: 1,
				},
			],
			success_url: `${envVars.FRONTEND_URL}/payment-success`,
			cancel_url: `${envVars.FRONTEND_URL}/payment-failed`,
		})

		console.log(session)

		return appointmentResult
	})

	return result
}

export const AppointmentService = {
	createAppointmentIntoDB,
}
