import { PrismaClient } from '@prisma/client'
import type { Request, Response } from 'express'
import { AdminService } from './admin.service'

const getAllAdmin = async (req: Request, res: Response) => {
	try {
		const result = await AdminService.getAllAdminFromDB()
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
