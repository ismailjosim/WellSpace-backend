import type { Request, Response } from 'express'
import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import StatusCode from '@/utils/statusCode'
import { scheduleService } from './schedule.service'
import { pick } from '../../utils/prismaFilter'
import AppError from '../../helpers/AppError'

const createSchedule = catchAsync(async (req: Request, res: Response) => {
	const result = await scheduleService.createScheduleIntoDb(req.body)
	sendResponse(res, {
		statusCode: StatusCode.CREATED,
		success: true,
		message: 'Schedule created successfully',
		data: result,
	})
})

const getScheduleForDoctor = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, ['startDateTime', 'endDateTime'])
	const options = pick(req.query, ['page', 'limit', 'sortBy', 'orderBy'])
	const result = await scheduleService.getScheduleForDoctorFromDB(
		filters,
		options,
	)
	sendResponse(res, {
		statusCode: StatusCode.OK,
		success: true,
		message: 'Schedules Retrieved successfully',
		meta: result.meta,
		data: result.data,
	})
})

const deleteSchedule = catchAsync(async (req: Request, res: Response) => {
	const result = await scheduleService.deleteScheduleFromDB(
		req.params.id as string,
	)
	sendResponse(res, {
		statusCode: StatusCode.OK,
		success: true,
		message: `ID: ${req.params.id} schedule deleted successfully`,
		data: result,
	})
})

const deleteDateRangeSchedule = catchAsync(
	async (req: Request, res: Response) => {
		const { startDateTime, endDateTime } = req.query as {
			startDateTime?: string
			endDateTime?: string
		}

		// Validation: Both dates are required
		if (!startDateTime || !endDateTime) {
			throw new AppError(
				StatusCode.BAD_REQUEST,
				'Both startDateTime and endDateTime are required',
			)
		}

		// Validate date format
		const start = new Date(startDateTime)
		const end = new Date(endDateTime)

		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			throw new AppError(
				StatusCode.BAD_REQUEST,
				'Invalid date format. Use ISO 8601 format',
			)
		}

		// Validate date range logic
		if (start > end) {
			throw new AppError(
				StatusCode.BAD_REQUEST,
				'startDateTime must be before or equal to endDateTime',
			)
		}

		const result = await scheduleService.deleteDateRangeScheduleFromDB(
			startDateTime,
			endDateTime,
		)

		sendResponse(res, {
			statusCode: StatusCode.OK,
			success: true,
			message: `${result.count} schedule(s) deleted successfully`,
			data: result,
		})
	},
)

export const ScheduleController = {
	createSchedule,
	getScheduleForDoctor,
	deleteSchedule,
	deleteDateRangeSchedule,
}
