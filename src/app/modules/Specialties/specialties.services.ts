import type { Request } from 'express'
import { prisma } from '../../config/prisma.config'
import { deleteFromCloudinary } from '../../config/multer.config'
import { paginationHelper, type IOptions } from '../../utils/paginationHelper'
import { buildWhereCondition } from '../../utils/prismaFilter'
import type { Prisma } from '@prisma/client'

const createSpecialtyIntoDB = async (req: Request) => {
	const cloudinaryUrl = req.file?.path
	const payloadData = req.body
	const specialtyData = {
		...payloadData,
		icon: cloudinaryUrl,
	}

	try {
		const result = await prisma.specialties.create({
			data: specialtyData,
		})
		return result
	} catch (error) {
		if (cloudinaryUrl) {
			try {
				await deleteFromCloudinary(cloudinaryUrl)
			} catch (deleteError) {
				console.error('Failed to delete Cloudinary image:', deleteError)
			}
		}
		throw error
	}
}

const getAllSpecialtiesFromDB = async (filters: any, options: IOptions) => {
	const { page, limit, skip, sortBy, orderBy } =
		paginationHelper.calcPagination(options)

	const whereConditions = buildWhereCondition<Prisma.SpecialtiesWhereInput>(
		['title'] as (keyof Prisma.SpecialtiesWhereInput)[],
		filters,
	)

	const result = await prisma.specialties.findMany({
		where: whereConditions,
		skip,
		take: limit,
	})

	const total = await prisma.specialties.count({ where: whereConditions })

	return {
		meta: { page, limit, total },
		data: result,
	}
}
const deleteSpecialtyFromDB = async (id: string) => {
	try {
		// 1️⃣ Find the specialty record first to get its Cloudinary URL
		const specialty = await prisma.specialties.findUnique({
			where: { id },
		})

		if (!specialty) {
			throw new Error('Specialty not found')
		}

		// 2️⃣ Delete the specialty record from the database
		const result = await prisma.specialties.delete({
			where: { id },
		})

		// 3️⃣ Then attempt to delete the image from Cloudinary
		if (specialty.icon) {
			try {
				await deleteFromCloudinary(specialty.icon)
			} catch (cloudErr) {
				console.error('Failed to delete image from Cloudinary:', cloudErr)
			}
		}

		return result
	} catch (error) {
		console.error('Error deleting specialty:', error)
		throw error
	}
}

export const SpecialtiesServices = {
	createSpecialtyIntoDB,
	getAllSpecialtiesFromDB,
	deleteSpecialtyFromDB,
}
