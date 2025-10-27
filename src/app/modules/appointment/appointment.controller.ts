import { type Request, type Response } from 'express'
import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import StatusCode from '@/utils/statusCode'
import { AppointmentService } from './appointment.service'

const createAppointment = catchAsync(async (req: Request, res: Response) => {
	const result = await AppointmentService.createAppointmentIntoDB(
		req.user,
		req.body,
	)

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
