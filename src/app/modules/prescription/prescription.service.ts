import { prisma } from '@/config/prisma.config'
import {
	AppointmentStatus,
	PaymentStatus,
	UserRole,
	type Prescription,
} from '@prisma/client'
import type { JwtPayload } from 'jsonwebtoken'
import AppError from '../../helpers/AppError'
import StatusCode from '../../utils/statusCode'

const createPrescriptionIntoDB = async (
	user: JwtPayload,
	payload: Partial<Prescription>,
) => {
	const appointmentData = await prisma.appointment.findUniqueOrThrow({
		where: {
			id: payload.appointmentId,
			status: AppointmentStatus.COMPLETED,
			paymentStatus: PaymentStatus.PAID,
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

const getMyPrescriptions = async (user: JwtPayload) => {
	let prescriptions

	if (user.role === UserRole.PATIENT) {
		// Patient: get prescriptions for this patient
		prescriptions = await prisma.prescription.findMany({
			where: { patientId: user.id },
			include: { doctor: true, appointment: true },
			orderBy: { createdAt: 'desc' },
		})
	} else if (user.role === UserRole.DOCTOR) {
		// Doctor: get prescriptions created by this doctor
		prescriptions = await prisma.prescription.findMany({
			where: { doctorId: user.id },
			include: { patient: true, appointment: true },
			orderBy: { createdAt: 'desc' },
		})
	} else {
		throw new AppError(
			StatusCode.FORBIDDEN,
			'you are not authorized to access this prescription',
		)
	}

	return prescriptions
}
export const PrescriptionService = {
	createPrescriptionIntoDB,
	getMyPrescriptions,
}
