import { type Request, type Response } from 'express'
import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import StatusCode from '@/utils/statusCode'
import { AppointmentService } from './appointment.service'
import type { JwtPayload } from 'jsonwebtoken'

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

export const AppointmentController = {
	createAppointment,
}
