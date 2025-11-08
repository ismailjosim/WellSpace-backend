import { prisma } from '@/config/prisma.config'
import { PaymentStatus, UserRole, AppointmentStatus } from '@prisma/client'
import type { JwtPayload } from 'jsonwebtoken'
import AppError from '@/helpers/AppError'
import StatusCode from '@/utils/statusCode'

// Types for better type safety
interface AppointmentStatusCount {
	status: AppointmentStatus
	count: number
}

interface BarChartDataPoint {
	month: Date
	count: number
}

// Utility function to format appointment status distribution
const formatAppointmentStatusDistribution = (
	data: Array<{ status: AppointmentStatus; _count: { id: number } }>,
): AppointmentStatusCount[] => {
	return data.map(({ status, _count }) => ({
		status,
		count: Number(_count.id),
	}))
}

const fetchDashboardMetaDataFromDB = async (user: JwtPayload) => {
	// Fixed: Correct switch case syntax
	switch (user.role) {
		case UserRole.ADMIN:
			return await getAdminMetaData()
		case UserRole.DOCTOR:
			return await getDoctorMetaData(user)
		case UserRole.PATIENT:
			return await getPatientMetaData(user)
		default:
			throw new AppError(StatusCode.BAD_REQUEST, 'Invalid user role!')
	}
}

// * Patient Meta data function - Optimized with parallel queries
const getPatientMetaData = async (user: JwtPayload) => {
	const patientData = await prisma.patient.findUniqueOrThrow({
		where: { email: user?.email },
		select: { id: true }, // Only select needed field
	})

	// Run all queries in parallel
	const [
		appointmentCount,
		prescriptionCount,
		reviewCount,
		appointmentStatusDistribution,
	] = await Promise.all([
		prisma.appointment.count({
			where: { patientId: patientData.id },
		}),
		prisma.prescription.count({
			where: { patientId: patientData.id },
		}),
		prisma.review.count({
			where: { patientId: patientData.id },
		}),
		prisma.appointment.groupBy({
			by: ['status'],
			_count: { id: true },
			where: { patientId: patientData.id },
		}),
	])

	return {
		appointmentCount,
		prescriptionCount,
		reviewCount,
		appointmentStatusDistribution: formatAppointmentStatusDistribution(
			appointmentStatusDistribution,
		),
	}
}

//* Doctor Meta data function - Optimized with parallel queries
const getDoctorMetaData = async (user: JwtPayload) => {
	const doctorData = await prisma.doctor.findUniqueOrThrow({
		where: { email: user?.email },
		select: { id: true }, // Only select needed field
	})

	// Run all queries in parallel
	const [
		appointmentCount,
		uniquePatients,
		reviewCount,
		totalRevenue,
		appointmentStatusDistribution,
	] = await Promise.all([
		prisma.appointment.count({
			where: { doctorId: doctorData.id },
		}),
		prisma.appointment.findMany({
			where: { doctorId: doctorData.id },
			distinct: ['patientId'],
			select: { patientId: true },
		}),
		prisma.review.count({
			where: { doctorId: doctorData.id },
		}),
		prisma.payment.aggregate({
			_sum: { amount: true },
			where: {
				appointment: { doctorId: doctorData.id },
				status: PaymentStatus.PAID,
			},
		}),
		prisma.appointment.groupBy({
			by: ['status'],
			_count: { id: true },
			where: { doctorId: doctorData.id },
		}),
	])

	return {
		appointmentCount,
		reviewCount,
		patientCount: uniquePatients.length,
		totalRevenue: totalRevenue._sum.amount || 0,
		appointmentStatusDistribution: formatAppointmentStatusDistribution(
			appointmentStatusDistribution,
		),
	}
}

//* Admin Meta data function - Optimized with parallel queries
const getAdminMetaData = async () => {
	// Run all base queries and chart data in parallel
	const [
		patientCount,
		doctorCount,
		adminCount,
		appointmentCount,
		paymentCount,
		totalRevenue,
		barChartData,
		pieChartData,
	] = await Promise.all([
		prisma.patient.count(),
		prisma.doctor.count(),
		prisma.admin.count(),
		prisma.appointment.count(),
		prisma.payment.count(),
		prisma.payment.aggregate({
			_sum: { amount: true },
			where: { status: PaymentStatus.PAID },
		}),
		getBarChartData(),
		getPieChartData(),
	])

	return {
		patientCount,
		doctorCount,
		adminCount,
		appointmentCount,
		paymentCount,
		totalRevenue: totalRevenue._sum.amount || 0,
		barChartData,
		pieChartData,
	}
}

// Optimized with proper typing and date formatting
const getBarChartData = async (): Promise<BarChartDataPoint[]> => {
	const appointmentCountPerMonth = await prisma.$queryRaw<BarChartDataPoint[]>`
		SELECT
			DATE_TRUNC('month', "createdAt") as month,
			CAST(COUNT(*) AS INTEGER) AS count
		FROM "appointments"
		WHERE "createdAt" >= NOW() - INTERVAL '12 months'
		GROUP BY month
		ORDER BY month ASC
	`
	return appointmentCountPerMonth
}

// Optimized with helper function
const getPieChartData = async (): Promise<AppointmentStatusCount[]> => {
	const appointmentStatusDistribution = await prisma.appointment.groupBy({
		by: ['status'],
		_count: { id: true },
	})
	return formatAppointmentStatusDistribution(appointmentStatusDistribution)
}

export const MetaService = {
	fetchDashboardMetaDataFromDB,
}
