import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import StatusCode from '@/utils/statusCode'
import { DoctorScheduleService } from './doctorSchedule.service'
import type { Request, Response } from 'express'

const createDoctorSchedule = catchAsync(async (req: Request, res: Response) => {
	const result = await DoctorScheduleService.createDoctorScheduleIntoDB(
		req.user,
		req.body,
	)
	sendResponse(res, {
		statusCode: StatusCode.CREATED,
		success: true,
		message: 'Doctor schedule created successfully!',
		data: result,
	})
})

export const DoctorScheduleController = {
	createDoctorSchedule,
}
