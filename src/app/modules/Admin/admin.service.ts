import type { Prisma } from '@prisma/client'
import prisma from '../../config'
import { buildWhereCondition } from '../../utils/prismaFilter'
import { paginationHelper } from '../../utils/paginationHelper'

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
	return result
}

export const AdminService = {
	getAllAdminFromDB,
}
