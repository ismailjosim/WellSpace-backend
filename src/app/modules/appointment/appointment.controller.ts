import { type Request, type Response } from 'express'
import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import StatusCode from '@/utils/statusCode'
import { AppointmentService } from './appointment.service'
import type { JwtPayload } from 'jsonwebtoken'
import { pick } from '../../utils/prismaFilter'
import { appointmentFilterableFields } from './appointment.constant'
import { AppointmentStatus } from '@prisma/client'
import AppError from '../../helpers/AppError'

const createAppointment = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as JwtPayload
	const payload = req.body
	const result = await AppointmentService.createAppointmentIntoDB(user, payload)

	sendResponse(res, {
		statusCode: StatusCode.CREATED,
		success: true,
		message: 'Appointment created successfully!',
		data: result,
	})
})
const getMyAppointment = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['page', 'limit', 'sortBy', 'orderBy'])
	const filters = pick(req.query, appointmentFilterableFields)
	const user = req.user as JwtPayload
	const result = await AppointmentService.getMyAppointmentFromDB(
		options,
		filters,
		user,
	)

	sendResponse(res, {
		statusCode: StatusCode.OK,
		success: true,
		message: 'Appointment Retrieved successfully!',
		data: result,
	})
})
const updateAppointmentStatus = catchAsync(
	async (req: Request, res: Response) => {
		const user = req.user as JwtPayload
		const { appointmentId } = req.params
		const { status } = req.body

		console.log({ appointmentId, status, user })

		if (
			!Object.values(AppointmentStatus).includes(status as AppointmentStatus)
		) {
			throw new AppError(StatusCode.BAD_REQUEST, 'Invalid appointment status')
		}

		const result = await AppointmentService.updateAppointmentStatusInfoDB(
			appointmentId as string,
			user,
			status as AppointmentStatus,
		)

		sendResponse(res, {
			statusCode: StatusCode.OK,
			success: true,
			message: 'Appointment Retrieved successfully!',
			data: result,
		})
	},
)

export const AppointmentController = {
	createAppointment,
	getMyAppointment,
	updateAppointmentStatus,
}
