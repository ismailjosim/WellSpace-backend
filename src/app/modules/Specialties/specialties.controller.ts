import type { Request, Response } from 'express'

import StatusCode from '@/utils/statusCode'
import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import { SpecialtiesServices } from './specialties.services'

const createSpecialty = catchAsync(async (req: Request, res: Response) => {
	const result = await SpecialtiesServices.createSpecialtyIntoDB(req.body)
	sendResponse(res, {
		success: true,
		statusCode: StatusCode.CREATED,
		message: 'Specialty Created Successfully',
		data: result,
	})
})
const getAllSpecialties = catchAsync(async (req: Request, res: Response) => {
	const result = await SpecialtiesServices.getAllSpecialtiesFromDB()
	sendResponse(res, {
		success: true,
		statusCode: StatusCode.OK,
		message: 'All Specialties Retrieved Successfully',
		data: result,
	})
})

export const SpecialtiesController = {
	createSpecialty,
	getAllSpecialties,
}
