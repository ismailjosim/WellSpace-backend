import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import StatusCode from '@/utils/statusCode'
import { DoctorScheduleService } from './doctorSchedule.service'
import type { Request, Response } from 'express'
import { pick } from '../../utils/prismaFilter'
import { scheduleFilterableFields } from './doctorSchedule.constants'

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
const getAllDoctorSchedules = catchAsync(
	async (req: Request, res: Response) => {
		const filters = pick(req.query, scheduleFilterableFields)
		const options = pick(req.query, ['limit', 'page', 'sortBy', 'orderBy'])
		const result = await DoctorScheduleService.getAllDoctorSchedulesFromDB(
			filters,
			options,
		)
		sendResponse(res, {
			statusCode: StatusCode.CREATED,
			success: true,
			message: 'All Doctors schedule retrieved successfully!',
			data: result,
		})
	},
)
const getMySchedule = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, scheduleFilterableFields)
	const options = pick(req.query, ['limit', 'page', 'sortBy', 'orderBy'])
	const result = await DoctorScheduleService.getMyScheduleFromDB(
		filters,
		options,
		req.user,
	)
	sendResponse(res, {
		statusCode: StatusCode.CREATED,
		success: true,
		message: 'Doctors schedule retrieved successfully!',
		data: result,
	})
})
const deleteDoctorScheduleById = catchAsync(
	async (req: Request, res: Response) => {
		const result = await DoctorScheduleService.deleteDoctorScheduleByIdFromDB(
			req.user,
			req.params.id as string,
		)
		sendResponse(res, {
			statusCode: StatusCode.CREATED,
			success: true,
			message: 'schedule deleted successfully!',
			data: result,
		})
	},
)

export const DoctorScheduleController = {
	createDoctorSchedule,
	getAllDoctorSchedules,
	getMySchedule,
	deleteDoctorScheduleById,
}
