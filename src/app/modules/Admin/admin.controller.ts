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

export const AdminController = {
	getAllAdmin,
}
