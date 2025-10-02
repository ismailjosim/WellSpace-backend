import type { Request, Response } from 'express'
import { AdminService } from './admin.service'
import { pick } from '../../utils/prismaFilter'
import { adminFilterableFields } from './admin.constant'

const getAllAdmin = async (req: Request, res: Response) => {
	try {
		const filters = pick(req.query, adminFilterableFields)
		const options = pick(req.query, ['limit', 'page', 'sortBy', 'orderBy'])

		const result = await AdminService.getAllAdminFromDB(filters, options)

		res.status(201).send({
			success: true,
			message: 'All Admin Retrieved Successfully',
			meta: result.meta,
			data: result.data,
		})
	} catch (error: any) {
		res.status(500).send({
			success: false,
			message: error.name || 'something went wrong!',
			error,
		})
	}
}
const getSingleAdminByID = async (req: Request, res: Response) => {
	try {
		const result = await AdminService.getSingleAdminByIDFromDB(
			req.params.id as string,
		)

		res.status(201).send({
			success: true,
			message: `Admin Info Retrieved Successfully`,
			data: result,
		})
	} catch (error: any) {
		res.status(500).send({
			success: false,
			message: error.name || 'something went wrong!',
			error,
		})
	}
}
const updateAdminInfo = async (req: Request, res: Response) => {
	try {
		const result = await AdminService.updateAdminInfoIntoDB(
			req.params.id as string,
			req.body,
		)

		res.status(201).send({
			success: true,
			message: `Admin Info Retrieved Successfully`,
			data: result,
		})
	} catch (error: any) {
		res.status(500).send({
			success: false,
			message: error.message || 'something went wrong!',
			error,
		})
	}
}

export const AdminController = {
	getAllAdmin,
	getSingleAdminByID,
	updateAdminInfo,
}
