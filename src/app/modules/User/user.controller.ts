import type { Request, Response } from 'express'
import { UserServices } from './user.services'

const createAdmin = async (req: Request, res: Response) => {
	const result = await UserServices.createAdminIntoDB(req.body)
	res.status(201).send({
		success: true,
		message: 'Admin Created Successfully',
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
	createAdmin,
	getAllUser,
}
