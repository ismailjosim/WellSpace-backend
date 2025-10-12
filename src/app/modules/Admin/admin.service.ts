import type { Admin, Prisma } from '@prisma/client'

import { buildWhereCondition } from '../../utils/prismaFilter'
import { paginationHelper } from '../../utils/paginationHelper'
import { prisma } from '../../config/prisma.config'

const getAllAdminFromDB = async (params: any, options: any) => {
	const { page, limit, skip, sortBy, orderBy } =
		paginationHelper.calcPagination(options)

	const whereConditions: Prisma.AdminWhereInput = buildWhereCondition<{
		name: string
		email: string
	}>(['name', 'email'], params)

	const result = await prisma.admin.findMany({
		// search query
		where: whereConditions,
		skip,
		take: limit,
		orderBy:
			sortBy && orderBy
				? {
						[sortBy]: orderBy,
				  }
				: {
						createdAt: 'desc',
				  },
	})
	const total = await prisma.admin.count({
		where: whereConditions,
	})
	return {
		meta: {
			page,
			limit,
			total,
		},
		data: result,
	}
}
const getSingleAdminByIDFromDB = async (id: string) => {
	const result = await prisma.admin.findUnique({
		where: {
			id,
		},
	})
	return result
}
const updateAdminInfoIntoDB = async (id: string, payload: Partial<Admin>) => {
	// 🚫 Prevent user from updating email
	if ('email' in payload) {
		throw new Error('You are not authorized to update the email address')
	}

	const result = await prisma.admin.update({
		where: { id },
		data: payload as Prisma.AdminUpdateInput,
	})

	return result
}

export const AdminService = {
	getAllAdminFromDB,
	getSingleAdminByIDFromDB,
	updateAdminInfoIntoDB,
}
