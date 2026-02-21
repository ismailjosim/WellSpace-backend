import { prisma } from '@/config/prisma.config'
import type { JwtPayload } from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { stripeConfig } from '@/config/stripe.config'
import { envVars } from '@/config/env'
import { paginationHelper, type IOptions } from '@/utils/paginationHelper'
import { buildWhereCondition } from '@/utils/prismaFilter'
import {
	AppointmentStatus,
	PaymentStatus,
	UserRole,
	type Prisma,
} from '@prisma/client'
import AppError from '@/helpers/AppError'
import StatusCode from '@/utils/statusCode'

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

	await prisma.doctorSchedule.findFirstOrThrow({
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

const getAllAppointmentFromDB = async (options: IOptions, filters: any) => {
	const { page, limit, skip, sortBy, orderBy } =
		paginationHelper.calcPagination(options)
	const whereConditions = buildWhereCondition<Prisma.AppointmentWhereInput>(
		undefined,
		filters,
	)

	const result = await prisma.appointment.findMany({
		where: whereConditions,
		skip,
		take: limit,
		orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: 'desc' },
		include: {
			doctor: {
				include: {
					doctorSpecialties: {
						include: { specialties: true },
					},
				},
			},
			patient: true,
			schedule: true,
			prescription: true,
			reviews: true,
			payment: true,
		},
	})

	const total = await prisma.appointment.count({ where: whereConditions })
	return {
		meta: { page, limit, total },
		data: result,
	}
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
						schedule: true,
						prescription: true,
						reviews: true,
						payment: true,
						doctor: {
							include: {
								doctorSpecialties: {
									include: { specialties: true },
								},
							},
						},
					}
				: {
						doctor: {
							include: {
								doctorSpecialties: {
									include: {
										specialties: true,
									},
								},
							},
						},
						schedule: true,
						prescription: true,
						reviews: true,
						payment: true,
						patient: true,
					},
	})

	const total = await prisma.appointment.count({ where: whereConditions })
	return {
		meta: { page, limit, total },
		data: result,
	}
}

const updateAppointmentStatusInfoDB = async (
	appointmentId: string,
	user: JwtPayload,
	status: AppointmentStatus,
) => {
	// check if appointment exists
	const appointmentData = await prisma.appointment.findUniqueOrThrow({
		where: { id: appointmentId },
		include: { doctor: true },
	})

	// role-based access control
	if (user.role === UserRole.DOCTOR) {
		// only allow if doctor owns the appointment
		if (user.email !== appointmentData.doctor.email) {
			throw new AppError(
				StatusCode.FORBIDDEN,
				'You are not authorized to update this appointment',
			)
		}
	} else if (
		user.role !== UserRole.ADMIN &&
		user.role !== UserRole.SUPER_ADMIN
	) {
		// deny all other roles
		throw new AppError(
			StatusCode.FORBIDDEN,
			'You are not authorized to perform this action',
		)
	}

	// perform update
	const result = await prisma.appointment.update({
		where: { id: appointmentId },
		data: { status },
	})

	return result
}

const cancelUnpaidAppointments = async () => {
	const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000)

	// find unpaid appointment
	const unPaidAppointments = await prisma.appointment.findMany({
		where: {
			createdAt: {
				lte: thirtyMinsAgo,
			},
			paymentStatus: PaymentStatus.UNPAID,
		},
	})
	const appointmentIdsToCancel = unPaidAppointments.map(
		(appointment) => appointment.id,
	)
	// Delete those appointment also delete info from payment and change status
	await prisma.$transaction(async (tnx) => {
		await tnx.payment.deleteMany({
			where: {
				appointmentId: {
					in: appointmentIdsToCancel, // in loop
				},
			},
		})
		// delete appointment
		await tnx.appointment.deleteMany({
			where: {
				id: {
					in: appointmentIdsToCancel,
				},
			},
		})

		for (const unpaidAppointment of unPaidAppointments) {
			// change is books status to false
			await tnx.doctorSchedule.update({
				where: {
					doctorId_scheduleId: {
						doctorId: unpaidAppointment.doctorId,
						scheduleId: unpaidAppointment.scheduleId,
					},
				},
				data: {
					isBooked: false,
				},
			})
		}
	})
}

const createAppointmentWithPayLater = async (
	user: JwtPayload,
	payload: any,
) => {
	const patientData = await prisma.patient.findUniqueOrThrow({
		where: {
			email: user?.email,
		},
	})

	const doctorData = await prisma.doctor.findUniqueOrThrow({
		where: {
			id: payload.doctorId,
			isDeleted: false,
		},
	})

	await prisma.doctorSchedule.findFirstOrThrow({
		where: {
			doctorId: doctorData.id,
			scheduleId: payload.scheduleId,
			isBooked: false,
		},
	})

	const videoCallingId = uuidv4()

	const result = await prisma.$transaction(async (tnx) => {
		const appointmentData = await tnx.appointment.create({
			data: {
				patientId: patientData.id,
				doctorId: doctorData.id,
				scheduleId: payload.scheduleId,
				videoCallingId,
			},
			include: {
				patient: true,
				doctor: true,
				schedule: true,
			},
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

		const transactionId = uuidv4()

		await tnx.payment.create({
			data: {
				appointmentId: appointmentData.id,
				amount: doctorData.appointmentFee,
				transactionId,
			},
		})

		return appointmentData
	})

	return result
}

const initiatePaymentForAppointment = async (
	appointmentId: string,
	user: JwtPayload,
) => {
	const patientData = await prisma.patient.findUniqueOrThrow({
		where: {
			email: user?.email,
		},
	})

	const appointment = await prisma.appointment.findUnique({
		where: {
			id: appointmentId,
			patientId: patientData.id,
		},
		include: {
			payment: true,
			doctor: true,
		},
	})

	if (!appointment) {
		throw new AppError(
			StatusCode.BAD_REQUEST,
			'Appointment not found or unauthorized',
		)
	}

	if (appointment.paymentStatus !== PaymentStatus.UNPAID) {
		throw new AppError(
			StatusCode.BAD_REQUEST,
			'Payment already completed for this appointment',
		)
	}

	if (appointment.status === AppointmentStatus.CANCELED) {
		throw new AppError(
			StatusCode.BAD_REQUEST,
			'Cannot pay for cancelled appointment',
		)
	}

	// Create Stripe checkout session
	const session = await stripeConfig.checkout.sessions.create({
		payment_method_types: ['card'],
		mode: 'payment',
		customer_email: user?.email || '',
		line_items: [
			{
				price_data: {
					currency: 'bdt',
					product_data: {
						name: `Appointment with ${appointment.doctor.name}`,
					},
					unit_amount: appointment.payment!.amount * 100,
				},
				quantity: 1,
			},
		],
		metadata: {
			appointmentId: appointment.id,
			paymentId: appointment.payment!.id,
		},
		success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
		cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/my-appointments`,
	})

	return { paymentUrl: session.url }
}

export const AppointmentService = {
	createAppointmentIntoDB,
	getMyAppointmentFromDB,
	updateAppointmentStatusInfoDB,
	cancelUnpaidAppointments,
	getAllAppointmentFromDB,
	createAppointmentWithPayLater,
	initiatePaymentForAppointment,
}
