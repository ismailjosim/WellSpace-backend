import { prisma } from '@/config/prisma.config'
import { paginationHelper, type IOptions } from '@/utils/paginationHelper'
import { buildWhereCondition } from '@/utils/prismaFilter'
import { NotificationType, type Prisma } from '@prisma/client'
import type { JwtPayload } from 'jsonwebtoken'
import { NotificationStream } from './notification.stream'
import { notificationFilterableFields } from './notification.constants'
import AppError from '@/helpers/AppError'
import StatusCode from '@/utils/statusCode'

type NotificationPayload = {
	recipientId: string
	type: NotificationType
	title: string
	message: string
	appointmentId?: string
}

const createNotificationIntoDB = async (payload: NotificationPayload) => {
	const result = await prisma.notification.create({
		data: payload,
	})

	NotificationStream.sendToUser(payload.recipientId, 'notification', result)

	return result
}

const createManyNotificationsIntoDB = async (
	payloads: NotificationPayload[],
) => {
	const result = await Promise.all(
		payloads.map((payload) => createNotificationIntoDB(payload)),
	)

	return result
}

const createAppointmentBookedNotifications = async (appointmentId: string) => {
	const appointment = await prisma.appointment.findUnique({
		where: { id: appointmentId },
		include: {
			patient: true,
			doctor: true,
			schedule: true,
		},
	})

	if (!appointment) return []

	const users = await prisma.user.findMany({
		where: {
			email: {
				in: [appointment.patient.email, appointment.doctor.email],
			},
		},
		select: {
			id: true,
			email: true,
		},
	})

	const patientUser = users.find((user) => user.email === appointment.patient.email)
	const doctorUser = users.find((user) => user.email === appointment.doctor.email)
	const scheduleTime = appointment.schedule.startDateTime.toLocaleString()

	const notifications: NotificationPayload[] = []

	if (patientUser) {
		notifications.push({
			recipientId: patientUser.id,
			type: NotificationType.APPOINTMENT_BOOKED,
			title: 'Appointment booked',
			message: `Your appointment with Dr. ${appointment.doctor.name} is booked for ${scheduleTime}.`,
			appointmentId: appointment.id,
		})
	}

	if (doctorUser) {
		notifications.push({
			recipientId: doctorUser.id,
			type: NotificationType.APPOINTMENT_BOOKED,
			title: 'New appointment booked',
			message: `${appointment.patient.name} booked an appointment for ${scheduleTime}.`,
			appointmentId: appointment.id,
		})
	}

	return createManyNotificationsIntoDB(notifications)
}

const createAppointmentStatusNotifications = async (appointmentId: string) => {
	const appointment = await prisma.appointment.findUnique({
		where: { id: appointmentId },
		include: {
			patient: true,
			doctor: true,
		},
	})

	if (!appointment) return []

	const users = await prisma.user.findMany({
		where: {
			email: {
				in: [appointment.patient.email, appointment.doctor.email],
			},
		},
		select: {
			id: true,
			email: true,
		},
	})

	const patientUser = users.find((user) => user.email === appointment.patient.email)
	const doctorUser = users.find((user) => user.email === appointment.doctor.email)
	const status = appointment.status.toLowerCase()
	const notifications: NotificationPayload[] = []

	if (patientUser) {
		notifications.push({
			recipientId: patientUser.id,
			type: NotificationType.APPOINTMENT_STATUS_UPDATED,
			title: 'Appointment status updated',
			message: `Your appointment with Dr. ${appointment.doctor.name} is now ${status}.`,
			appointmentId: appointment.id,
		})
	}

	if (doctorUser) {
		notifications.push({
			recipientId: doctorUser.id,
			type: NotificationType.APPOINTMENT_STATUS_UPDATED,
			title: 'Appointment status updated',
			message: `Your appointment with ${appointment.patient.name} is now ${status}.`,
			appointmentId: appointment.id,
		})
	}

	return createManyNotificationsIntoDB(notifications)
}

const getMyNotificationsFromDB = async (
	user: JwtPayload,
	options: IOptions,
	filters: Record<string, any>,
) => {
	const { page, limit, skip, sortBy, orderBy } =
		paginationHelper.calcPagination(options)
	const whereConditions = buildWhereCondition<Prisma.NotificationWhereInput>(
		notificationFilterableFields as (keyof Prisma.NotificationWhereInput)[],
		filters,
	)

	const finalWhere: Prisma.NotificationWhereInput = {
		AND: [
			whereConditions,
			{
				recipientId: user.userId,
			},
		],
	}

	const [data, total, unreadCount] = await Promise.all([
		prisma.notification.findMany({
			where: finalWhere,
			skip,
			take: limit,
			orderBy:
				sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: 'desc' },
		}),
		prisma.notification.count({ where: finalWhere }),
		prisma.notification.count({
			where: {
				recipientId: user.userId,
				isRead: false,
			},
		}),
	])

	return {
		meta: { page, limit, total },
		unreadCount,
		data,
	}
}

const markNotificationAsReadIntoDB = async (
	user: JwtPayload,
	notificationId: string,
) => {
	const notification = await prisma.notification.findUnique({
		where: { id: notificationId },
	})

	if (!notification || notification.recipientId !== user.userId) {
		throw new AppError(StatusCode.NOT_FOUND, 'Notification not found')
	}

	return prisma.notification.update({
		where: { id: notificationId },
		data: { isRead: true },
	})
}

const markAllNotificationsAsReadIntoDB = async (user: JwtPayload) => {
	await prisma.notification.updateMany({
		where: {
			recipientId: user.userId,
			isRead: false,
		},
		data: { isRead: true },
	})

	return { message: 'All notifications marked as read' }
}

export const NotificationService = {
	createNotificationIntoDB,
	createManyNotificationsIntoDB,
	createAppointmentBookedNotifications,
	createAppointmentStatusNotifications,
	getMyNotificationsFromDB,
	markNotificationAsReadIntoDB,
	markAllNotificationsAsReadIntoDB,
}
