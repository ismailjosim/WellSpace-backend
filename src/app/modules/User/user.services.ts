import { Prisma, UserRole } from '@prisma/client'
import { prisma } from '@/config/prisma.config'
import type { Request } from 'express'
import { passwordManage } from '@/utils/passwordManage'
import { paginationHelper, type IOptions } from '@/utils/paginationHelper'
import { userSearchableFields } from './user.constant'
import { buildWhereCondition } from '@/utils/prismaFilter'

const createPatientIntoDB = async (req: Request) => {
	const hashedPassword: string = await passwordManage.hashingPassword(
		req.body.password,
	)
	const cloudinaryUrl = req.file?.path

	const payloadData = req.body.patient

	const patientData = {
		...payloadData,
		profilePhoto: cloudinaryUrl,
	}

	const result = await prisma.$transaction(async (transactionClient) => {
		await transactionClient.user.create({
			data: {
				email: payloadData.email,
				password: hashedPassword,
			},
		})

		return await transactionClient.patient.create({
			data: {
				...patientData,
			},
		})
	})

	return result
}

const createAdminIntoDB = async (req: Request) => {
	const hashedPassword: string = await passwordManage.hashingPassword(
		req.body.password,
	)
	const cloudinaryUrl = req.file?.path

	const payloadData = req.body.admin

	const adminData = {
		...payloadData,
		profilePhoto: cloudinaryUrl,
	}

	const result = await prisma.$transaction(async (transactionClient) => {
		await transactionClient.user.create({
			data: {
				email: payloadData.email,
				password: hashedPassword,
				role: UserRole.ADMIN,
			},
		})

		return await transactionClient.admin.create({
			data: {
				...adminData,
			},
		})
	})

	return result
}
const createDoctorIntoDB = async (req: Request) => {
	const hashedPassword: string = await passwordManage.hashingPassword(
		req.body.password,
	)
	const cloudinaryUrl = req.file?.path

	const payloadData = req.body.doctor

	const doctorData = {
		...payloadData,
		profilePhoto: cloudinaryUrl,
	}

	const result = await prisma.$transaction(async (transactionClient) => {
		await transactionClient.user.create({
			data: {
				email: payloadData.email,
				password: hashedPassword,
				role: UserRole.DOCTOR,
			},
		})

		return await transactionClient.doctor.create({
			data: {
				...doctorData,
			},
		})
	})

	return result
}
const getAllUsersFromDB = async (params: any, options: IOptions) => {
	const { page, limit, skip, sortBy, orderBy } =
		paginationHelper.calcPagination(options)

	const whereConditions = buildWhereCondition<Prisma.UserWhereInput>(
		userSearchableFields as (keyof Prisma.UserWhereInput)[],
		params,
	)

	const result = await prisma.user.findMany({
		skip,
		take: limit,

		where: whereConditions,
		orderBy: {
			[sortBy]: orderBy,
		},
	})

	const total = await prisma.user.count({
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

export const UserServices = {
	createAdminIntoDB,
	createPatientIntoDB,
	createDoctorIntoDB,
	getAllUsersFromDB,
}
