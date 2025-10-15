import type { Request, Response } from 'express'
import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import StatusCode from '@/utils/statusCode'
import { scheduleService } from './schedule.service'

const createSchedule = catchAsync(async (req: Request, res: Response) => {
	const result = await scheduleService.createScheduleIntoDb(req.body)
	sendResponse(res, {
		statusCode: StatusCode.CREATED,
		success: true,
		message: 'Schedule created successfully',
		data: result,
	})
})

export const ScheduleController = {
	createSchedule,
}
