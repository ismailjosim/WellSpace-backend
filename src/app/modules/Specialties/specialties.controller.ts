import type { Request, Response } from 'express'

import StatusCode from '@/utils/statusCode'
import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import { SpecialtiesServices } from './specialties.services'
import { pick } from '../../utils/prismaFilter'

const createSpecialty = catchAsync(async (req: Request, res: Response) => {
	const result = await SpecialtiesServices.createSpecialtyIntoDB(req)
	sendResponse(res, {
		success: true,
		statusCode: StatusCode.CREATED,
		message: 'Specialty Created Successfully',
		data: result,
	})
})
const getAllSpecialties = catchAsync(async (req: Request, res: Response) => {
	const options = pick(req.query, ['page', 'limit', 'sortBy', 'orderBy'])
	const filters = pick(req.query, ['title'])
	const result = await SpecialtiesServices.getAllSpecialtiesFromDB(
		filters,
		options,
	)
	sendResponse(res, {
		success: true,
		statusCode: StatusCode.OK,
		message: 'All Specialties Retrieved Successfully',
		meta: result.meta,
		data: result.data,
	})
})
const deleteSpecialty = catchAsync(async (req: Request, res: Response) => {
	const { id } = req.params
	const result = await SpecialtiesServices.deleteSpecialtyFromDB(id as string)
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
	deleteSpecialty,
}
