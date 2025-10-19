import { prisma } from '@/config/prisma.config'
import { paginationHelper, type IOptions } from '@/utils/paginationHelper'
import { buildWhereCondition } from '@/utils/prismaFilter'
import type { Prisma } from '@prisma/client'

const getAllDoctorFromD = async (filters: any, options: IOptions) => {
	const { page, limit, skip, sortBy, orderBy } =
		paginationHelper.calcPagination(options)
	const whereConditions = buildWhereCondition<Prisma.UserWhereInput>(
		undefined,
		filters,
	)
	const result = await prisma.doctor.findMany({
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
	const total = await prisma.doctor.count({
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

export const DoctorService = {
	getAllDoctorFromD,
}
