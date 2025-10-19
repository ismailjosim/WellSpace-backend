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
	const result = await DoctorService.getAllDoctorFromD(filters, options)
	sendResponse(res, {
		statusCode: StatusCode.CREATED,
		success: true,
		message: 'Doctor created successfully!',
		data: result,
	})
})

export const DoctorController = {
	getAllDoctor,
}
