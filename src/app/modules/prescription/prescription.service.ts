import { prisma } from '@/config/prisma.config'
import {
	AppointmentStatus,
	PaymentStatus,
	Prisma,
	UserRole,
	type Prescription,
} from '@prisma/client'
import type { JwtPayload } from 'jsonwebtoken'
import AppError from '../../helpers/AppError'
import StatusCode from '../../utils/statusCode'
import { paginationHelper, type IOptions } from '../../utils/paginationHelper'
import { buildWhereCondition } from '../../utils/prismaFilter'
import { prescriptionsFilterableFields } from './prescription.const'

const createPrescriptionIntoDB = async (
	user: JwtPayload,
	payload: Partial<Prescription>,
) => {
	const appointmentData = await prisma.appointment.findUniqueOrThrow({
		where: {
			id: payload.appointmentId,
			status: AppointmentStatus.COMPLETED,
			// paymentStatus: PaymentStatus.PAID, // TODO: uncomment this when payment flow is implemented
		},
		include: {
			doctor: true,
		},
	})

	if (user.role === UserRole.DOCTOR) {
		// only allow if doctor owns the appointment
		if (user.email !== appointmentData.doctor.email) {
			throw new AppError(StatusCode.FORBIDDEN, 'This is not your appointment')
		}
	}
	// Implement DB logic here
	const result = await prisma.prescription.create({
		data: {
			appointmentId: appointmentData.id,
			doctorId: appointmentData.doctorId,
			patientId: appointmentData.patientId,
			instructions: payload.instructions as string,
			followUpDate: payload.followUpDate || null,
		},
		include: {
			patient: true,
		},
	})

	return result
}

const getMyPrescriptionsFromDB = async (
	user: JwtPayload,
	filters: Record<string, any>,
	options: IOptions,
) => {
	const { page, limit, skip, sortBy, orderBy } =
		paginationHelper.calcPagination(options)

	// Build filter conditions based on filterable fields
	const whereConditions = buildWhereCondition<Prisma.PrescriptionWhereInput>(
		prescriptionsFilterableFields as (keyof Prisma.PrescriptionWhereInput)[],
		filters,
	)

	// Role-based base filter
	let roleFilter: Prisma.PrescriptionWhereInput = {}

	if (user.role === UserRole.PATIENT) {
		roleFilter = { patientId: user.id }
	} else if (user.role === UserRole.DOCTOR) {
		roleFilter = { doctorId: user.id }
	} else {
		throw new AppError(
			StatusCode.FORBIDDEN,
			'You are not authorized to access this prescription',
		)
	}

	const finalWhere: Prisma.PrescriptionWhereInput = {
		AND: [whereConditions, roleFilter],
	}

	const result = await prisma.prescription.findMany({
		where: finalWhere,
		skip,
		take: limit,
		orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: 'desc' },
		include: {
			doctor: true,
			patient: true,
			appointment: true,
		},
	})

	const total = await prisma.prescription.count({
		where: finalWhere,
	})

	return {
		meta: { page, limit, total },
		data: result,
	}
}
export const PrescriptionService = {
	createPrescriptionIntoDB,
	getMyPrescriptionsFromDB,
}
