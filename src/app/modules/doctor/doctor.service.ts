import { prisma } from '@/config/prisma.config'
import { paginationHelper, type IOptions } from '@/utils/paginationHelper'
import { buildWhereCondition } from '@/utils/prismaFilter'
import type { Prisma } from '@prisma/client'
import type { IDoctorUpdateInput } from './doctor.interface'
import AppError from '@/helpers/AppError'
import StatusCode from '@/utils/statusCode'

const getAllDoctorFromDB = async (filters: any, options: IOptions) => {
	const { page, limit, skip, sortBy, orderBy } =
		paginationHelper.calcPagination(options)
	const whereConditions = buildWhereCondition<Prisma.UserWhereInput>(
		undefined,
		filters,
	)

	const finalWhere: Prisma.DoctorWhereInput = {
		AND: [whereConditions, { isDeleted: false }],
	}

	const result = await prisma.doctor.findMany({
		// search query
		where: finalWhere,
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
		include: {
			doctorSpecialties: {
				include: {
					specialties: true,
				},
			},
		},
	})
	const formattedData = result.map((doctor) => ({
		...doctor,
		doctorSpecialties: doctor.doctorSpecialties.map((ds) => ({
			id: ds.specialties.id,
			title: ds.specialties.title,
			icon: ds.specialties.icon,
		})),
	}))

	const total = await prisma.doctor.count({
		where: finalWhere,
	})
	return {
		meta: {
			page,
			limit,
			total,
		},
		data: formattedData,
	}
}
const updateProfileInfoIntoDB = async (
	id: string,
	payload: Partial<IDoctorUpdateInput>,
) => {
	return await prisma.$transaction(async (tx) => {
		// 1️⃣ Check if doctor exists
		const isDoctorExist = await tx.doctor.findUnique({
			where: { id },
		})
		if (!isDoctorExist) {
			throw new AppError(StatusCode.NOT_FOUND, 'Doctor not found')
		}

		const { specialties, ...doctorData } = payload

		// 2️⃣ Handle specialties updates (add/remove)
		if (specialties && specialties.length > 0) {
			// --- Delete marked specialties
			const deletedSpecialtyIds = specialties.filter((s) => s.isDeleted)
			if (deletedSpecialtyIds.length > 0) {
				await Promise.all(
					deletedSpecialtyIds.map((specialty) =>
						tx.doctorSpecialties.deleteMany({
							where: {
								doctorId: id,
								specialtiesId: specialty.specialtyId,
							},
						}),
					),
				)
			}

			// --- Add new specialties
			const createdSpecialtyIds = specialties.filter((s) => !s.isDeleted)
			if (createdSpecialtyIds.length > 0) {
				await Promise.all(
					createdSpecialtyIds.map((specialty) =>
						tx.doctorSpecialties.create({
							data: {
								doctorId: id,
								specialtiesId: specialty.specialtyId,
							},
						}),
					),
				)
			}
		}

		// 3️⃣ Update doctor basic info
		const updatedDoctor = await tx.doctor.update({
			where: { id },
			data: doctorData,
			include: {
				doctorSpecialties: {
					include: {
						specialties: true,
					},
				},
			},
		})

		// 4️⃣ Return updated doctor (transaction commits automatically)
		return updatedDoctor
	})
}
const getSingleDoctorByIDFromDB = async (id: string) => {
	const result = await prisma.doctor.findUnique({
		where: { id },
		include: {
			doctorSpecialties: {
				include: {
					specialties: true,
				},
			},
		},
	})

	if (!result) {
		throw new AppError(StatusCode.NOT_FOUND, 'Doctor not found')
	}

	const formattedData = {
		...result,
		doctorSpecialties: result.doctorSpecialties.map((ds) => ({
			id: ds.specialties.id,
			title: ds.specialties.title,
			icon: ds.specialties.icon,
		})),
	}

	return formattedData
}
const deleteDoctorByIDFromDB = async (id: string) => {
	const isDoctorExist = await prisma.doctor.findUniqueOrThrow({
		where: { id },
	})

	if (!isDoctorExist) {
		throw new AppError(StatusCode.NOT_FOUND, 'Doctor not found')
	}

	// doctor soft delete
	const result = await prisma.$transaction(async (trx) => {
		return await trx.doctor.update({
			where: { id },
			data: {
				isDeleted: true,
			},
		})
	})

	return result
}

export const DoctorService = {
	getAllDoctorFromDB,
	updateProfileInfoIntoDB,
	getSingleDoctorByIDFromDB,
	deleteDoctorByIDFromDB,
}
