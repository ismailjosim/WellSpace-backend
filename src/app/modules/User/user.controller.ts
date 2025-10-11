import HttpStatus from 'http-status'
import type { Request, Response } from 'express'
import { UserServices } from './user.services'
import catchAsync from '../../shared/catchAsync'
import sendResponse from '../../shared/sendResponse'

const createAdmin = catchAsync(async (req: Request, res: Response) => {
	try {
		const result = await UserServices.createAdminIntoDB(req.body)
		res.status(201).send({
			success: true,
			message: 'Admin Created Successfully',
			data: result,
		})
	} catch (error: any) {
		res.status(500).send({
			success: false,
			message: error.name || 'something went wrong!',
			error,
		})
	}
})
const createPatient = async (req: Request, res: Response) => {
	const result = await UserServices.createPatientIntoDB(req)
	console.log(req.body)
	sendResponse(res, {
		success: true,
		statusCode: HttpStatus.CREATED,
		message: 'Patient Created Successfully',
		data: result,
	})
}
const getAllUser = async (req: Request, res: Response) => {
	const payload = req.body
	// const result = await UserServices.createAdminIntoDB(payload)
	res.status(201).send({
		success: true,
		message: 'All User Retrieved Successfully',
		data: null,
	})
}

export const UserController = {
	createPatient,
	createAdmin,
	getAllUser,
}
