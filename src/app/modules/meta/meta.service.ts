import { prisma } from '@/config/prisma.config'
import { PaymentStatus, UserRole } from '@prisma/client'
import type { JwtPayload } from 'jsonwebtoken'
import AppError from '@/helpers/AppError'
import StatusCode from '@/utils/statusCode'

const fetchDashboardMetaDataFromDB = async (user: JwtPayload) => {
	let metadata

	switch (user.role) {
		case UserRole.ADMIN || UserRole.ADMIN:
			metadata = await getAdminMetaData()
			break
		case UserRole.DOCTOR:
			metadata = await getDoctorMetaData(user)
			break
		case UserRole.PATIENT:
			metadata = await getPatientMetaData(user)
			break
		default:
			throw new AppError(StatusCode.BAD_REQUEST, 'Invalid user role!')
	}

	return metadata
}

// * Patient Meta data function
const getPatientMetaData = async (user: JwtPayload) => {
	const patientData = await prisma.patient.findUniqueOrThrow({
		where: {
			email: user?.email,
		},
	})

	const appointmentCount = await prisma.appointment.count({
		where: {
			patientId: patientData.id,
		},
	})

	const prescriptionCount = await prisma.prescription.count({
		where: {
			patientId: patientData.id,
		},
	})

	const reviewCount = await prisma.review.count({
		where: {
			patientId: patientData.id,
		},
	})

	const appointmentStatusDistribution = await prisma.appointment.groupBy({
		by: ['status'],
		_count: { id: true },
		where: {
			patientId: patientData.id,
		},
	})

	const formattedAppointmentStatusDistribution =
		appointmentStatusDistribution.map(({ status, _count }) => ({
			status,
			count: Number(_count.id),
		}))

	return {
		appointmentCount,
		prescriptionCount,
		reviewCount,
		formattedAppointmentStatusDistribution,
	}
}

//* Doctor Meta data function
const getDoctorMetaData = async (user: JwtPayload) => {
	const doctorData = await prisma.doctor.findUniqueOrThrow({
		where: {
			email: user?.email,
		},
	})

	const appointmentCount = await prisma.appointment.count({
		where: {
			doctorId: doctorData.id,
		},
	})

	const patientCount = await prisma.appointment.groupBy({
		by: ['patientId'],
		_count: {
			id: true,
		},
	})

	const reviewCount = await prisma.review.count({
		where: {
			doctorId: doctorData.id,
		},
	})

	const totalRevenue = await prisma.payment.aggregate({
		_sum: {
			amount: true,
		},
		where: {
			appointment: {
				doctorId: doctorData.id,
			},
			status: PaymentStatus.PAID,
		},
	})

	const appointmentStatusDistribution = await prisma.appointment.groupBy({
		by: ['status'],
		_count: { id: true },
		where: {
			doctorId: doctorData.id,
		},
	})

	const formattedAppointmentStatusDistribution =
		appointmentStatusDistribution.map(({ status, _count }) => ({
			status,
			count: Number(_count.id),
		}))

	return {
		appointmentCount,
		reviewCount,
		patientCount: patientCount.length,
		totalRevenue,
		formattedAppointmentStatusDistribution,
	}
}

//* admin Meta data function
const getAdminMetaData = async () => {
	const patientCount = await prisma.patient.count()
	const doctorCount = await prisma.doctor.count()
	const adminCount = await prisma.admin.count()
	const appointmentCount = await prisma.appointment.count()
	const paymentCount = await prisma.payment.count()
	const totalRevenue = await prisma.payment.aggregate({
		_sum: {
			amount: true,
		},
		where: {
			status: PaymentStatus.PAID,
		},
	})
	const barChartData = await getBarChartData()
	const pieChartData = await getPieChartData()
	return {
		patientCount,
		doctorCount,
		adminCount,
		appointmentCount,
		paymentCount,
		totalRevenue: totalRevenue._sum.amount,
		barChartData,
		pieChartData,
	}
}

const getBarChartData = async () => {
	const appointmentCountPerMonth = await prisma.$queryRaw`
    SELECT
        DATE_TRUNC('month', "createdAt") as month,
        CAST(COUNT(*) AS INTEGER) AS count
    FROM "appointments"
    GROUP BY month
    ORDER BY month ASC
    `
	return appointmentCountPerMonth
}

const getPieChartData = async () => {
	const appointmentStatusDistribution = await prisma.appointment.groupBy({
		by: ['status'],
		_count: { id: true },
	})
	const formattedAppointmentStatusDistribution =
		appointmentStatusDistribution.map(({ status, _count }) => ({
			status,
			count: Number(_count.id),
		}))
	return formattedAppointmentStatusDistribution
}

export const MetaService = {
	fetchDashboardMetaDataFromDB,
}
