import HttpStatus from 'http-status'
import type { Request, Response } from 'express'
import { UserServices } from './user.services'
import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import { pick } from '@/utils/prismaFilter'
import { userFilterableFields } from './user.constant'

const createPatient = catchAsync(async (req: Request, res: Response) => {
	const result = await UserServices.createPatientIntoDB(req)
	sendResponse(res, {
		success: true,
		statusCode: HttpStatus.CREATED,
		message: 'Patient Created Successfully',
		data: result,
	})
})

const createAdmin = catchAsync(async (req: Request, res: Response) => {
	const result = await UserServices.createAdminIntoDB(req)
	sendResponse(res, {
		success: true,
		statusCode: HttpStatus.CREATED,
		message: 'Admin Created Successfully',
		data: result,
	})
})
const createDoctor = catchAsync(async (req: Request, res: Response) => {
	const result = await UserServices.createDoctorIntoDB(req)
	sendResponse(res, {
		success: true,
		statusCode: HttpStatus.CREATED,
		message: 'Doctor Created Successfully',
		data: result,
	})
})
const getAllUser = catchAsync(async (req: Request, res: Response) => {
	const filters = pick(req.query, userFilterableFields)
	const options = pick(req.query, ['page', 'limit', 'sortBy', 'orderBy'])
	const result = await UserServices.getAllUsersFromDB(filters, options)
	sendResponse(res, {
		success: true,
		statusCode: HttpStatus.OK,
		message: 'All User Retrieved Successfully',
		data: result,
	})
})

export const UserController = {
	createPatient,
	createAdmin,
	createDoctor,
	getAllUser,
}
