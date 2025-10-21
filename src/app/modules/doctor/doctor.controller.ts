import { type Request, type Response } from 'express'
import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import StatusCode from '@/utils/statusCode'
import { DoctorService } from './doctor.service'
import { pick } from '@/utils/prismaFilter'
import { doctorFilterableFields } from './doctor.constant'

const getAllDoctor = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['page', 'limit', 'sortBy', 'orderBy'])
	const filters = pick(req.query, doctorFilterableFields)
	const result = await DoctorService.getAllDoctorFromDB(filters, options)
	sendResponse(res, {
		statusCode: StatusCode.CREATED,
		success: true,
		message: 'Doctor created successfully!',
		data: result,
	})
})

const updateProfileInfo = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string
	const result = await DoctorService.updateProfileInfoIntoDB(id, req.body)
	sendResponse(res, {
		statusCode: StatusCode.OK,
		success: true,
		message: 'Doctor Profile Updated successfully!',
		data: result,
	})
})

export const DoctorController = {
	getAllDoctor,
	updateProfileInfo,
}
