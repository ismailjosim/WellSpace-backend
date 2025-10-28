import { prisma } from '@/config/prisma.config'
import type { JwtPayload } from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { stripeConfig } from '../../config/stripe.config'
import { envVars } from '../../config/env'
import { paginationHelper, type IOptions } from '../../utils/paginationHelper'
import { buildWhereCondition } from '../../utils/prismaFilter'
import { UserRole, type Prisma } from '@prisma/client'

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
		const paymentData = await tnx.payment.create({
			data: {
				appointmentId: appointmentResult.id,
				amount: doctorData.appointmentFee,
				transactionId,
			},
		})

		const session = await stripeConfig.checkout.sessions.create({
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
			metadata: {
				appointmentId: appointmentResult.id,
				paymentId: paymentData.id,
			},
			success_url: `${envVars.FRONTEND_URL}/payment-success`,
			cancel_url: `${envVars.FRONTEND_URL}/payment-failed`,
		})

		return { paymentUrl: session.url }
	})

	return result
}
const getMyAppointmentFromDB = async (
	options: IOptions,
	filters: any,
	user: JwtPayload,
) => {
	const { page, limit, skip, sortBy, orderBy } =
		paginationHelper.calcPagination(options)
	const whereConditions = buildWhereCondition<Prisma.AppointmentWhereInput>(
		undefined,
		filters,
	)
	// Ensure AND array exists
	if (!('AND' in whereConditions)) {
		whereConditions.AND = []
	}

	// Add role-based filter
	if (user.role === UserRole.PATIENT) {
		whereConditions.AND.push({
			patient: { email: user.email },
		})
	} else if (user.role === UserRole.DOCTOR) {
		whereConditions.AND.push({
			doctor: { email: user.email },
		})
	}

	const result = await prisma.appointment.findMany({
		where: whereConditions,
		skip,
		take: limit,
		orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: 'desc' },
		include:
			user.role === UserRole.DOCTOR
				? {
						patient: true,
				  }
				: {
						doctor: true,
				  },
	})

	const total = await prisma.appointment.count({ where: whereConditions })
	return {
		meta: { page, limit, total },
		data: result,
	}
}

export const AppointmentService = {
	createAppointmentIntoDB,
	getMyAppointmentFromDB,
}
