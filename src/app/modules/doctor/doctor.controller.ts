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

	// console.log('Raw Query:', req.query)
	// console.log('Extracted Filters:', filters)
	// console.log('Query Result Count:', result.data.length)

	sendResponse(res, {
		statusCode: StatusCode.OK,
		success: true,
		message: 'All doctors retrieved successfully!',
		meta: result.meta,
		data: result.data,
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
const getSingleDoctorByID = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string
	const result = await DoctorService.getSingleDoctorByIDFromDB(id)
	sendResponse(res, {
		statusCode: StatusCode.OK,
		success: true,
		message: 'Doctor info retrieved successfully!',
		data: result,
	})
})
const deleteDoctorByID = catchAsync(async (req: Request, res: Response) => {
	const id = req.params.id as string
	const result = await DoctorService.deleteDoctorByIDFromDB(id)
	sendResponse(res, {
		statusCode: StatusCode.OK,
		success: true,
		message: 'Doctor Deleted successfully!',
		data: result,
	})
})

const getAISuggestion = catchAsync(async (req: Request, res: Response) => {
	const result = await DoctorService.getAISuggestionFromDB(req.body)
	sendResponse(res, {
		statusCode: StatusCode.OK,
		success: true,
		message: 'All doctors retrieved successfully!',
		data: {
			totalDoctors: result?.totalDoctors,
			recommendedDoctors: result.recommendedDoctors,
			reasoning: result.reasoning,
		},
	})
})

export const DoctorController = {
	getAllDoctor,
	updateProfileInfo,
	getSingleDoctorByID,
	deleteDoctorByID,
	getAISuggestion,
}
