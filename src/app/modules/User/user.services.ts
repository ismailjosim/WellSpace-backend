import { Prisma, UserRole, UserStatus } from '@prisma/client'
import { prisma } from '@/config/prisma.config'
import type { Request } from 'express'
import { passwordManage } from '@/utils/passwordManage'
import { paginationHelper, type IOptions } from '@/utils/paginationHelper'
import { userSearchableFields } from './user.constant'
import { buildWhereCondition } from '@/utils/prismaFilter'
import type { JwtPayload } from 'jsonwebtoken'
import StatusCode from '../../utils/statusCode'
import AppError from '../../helpers/AppError'

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

	const { specialties, ...payloadData } = req.body.doctor

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

		const createDoctorData = await transactionClient.doctor.create({
			data: {
				...doctorData,
			},
		})

		// Handle specialties relation
		if (specialties && Array.isArray(specialties) && specialties.length > 0) {
			// verify all specialties exist
			const existingSpecialties = await transactionClient.specialties.findMany({
				where: {
					id: { in: specialties },
				},
				select: { id: true },
			})

			const existingSpecialtiesIds = existingSpecialties.map((s) => s.id)
			const invalidSpecialties = specialties.filter(
				(id: string) => !existingSpecialtiesIds.includes(id),
			)
			if (invalidSpecialties.length > 0) {
				throw new AppError(
					StatusCode.BAD_REQUEST,
					`Invalid specialties IDs: ${invalidSpecialties.join(', ')}`,
				)
			}

			const doctorSpecialtiesData = specialties.map((specialtyId: string) => ({
				doctorId: createDoctorData.id,
				specialtiesId: specialtyId,
			}))

			await transactionClient.doctorSpecialties.createMany({
				data: doctorSpecialtiesData,
			})
		}
		// step 4: Return the created doctor data
		const doctorWithSpecialties = await transactionClient.doctor.findUnique({
			where: { id: createDoctorData.id },
			include: {
				doctorSpecialties: {
					include: { specialties: true },
				},
			},
		})
		return doctorWithSpecialties
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
const getMyProfileFromDB = async (user: JwtPayload) => {
	const userInfo = await prisma.user.findUniqueOrThrow({
		where: {
			email: user.email,
			status: UserStatus.ACTIVE,
		},
	})
	const { password, ...baseUserData } = userInfo
	// Step 3: Role-based join query
	let roleBasedData: any = null

	switch (userInfo.role) {
		case UserRole.PATIENT:
			roleBasedData = await prisma.patient.findUnique({
				where: { email: userInfo.email },
				include: {
					prescriptions: true,
					appointments: true,
					medicalReport: true,
					patientHealthData: true,
				},
			})
			break

		case UserRole.DOCTOR:
			roleBasedData = await prisma.doctor.findUnique({
				where: { email: userInfo.email },
				include: {
					doctorSpecialties: {
						include: { specialties: true },
					},
					appointments: true,
					prescriptions: true,
				},
			})
			break

		case UserRole.ADMIN:
			roleBasedData = await prisma.admin.findUnique({
				where: { email: userInfo.email },
			})
			break

		case UserRole.SUPER_ADMIN:
			roleBasedData = await prisma.admin.findUnique({
				where: { email: userInfo.email },
			})
			break

		default:
			throw new AppError(StatusCode.FORBIDDEN, 'Invalid user role')
	}

	// Step 4: Return merged response
	return {
		...baseUserData,
		profile: roleBasedData,
	}
}
const changeProfileStatusIntoDB = async (
	user: JwtPayload,
	id: string,
	status: UserStatus,
) => {
	// Step 1: Authorization check
	if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
		throw new AppError(
			StatusCode.FORBIDDEN,
			'You are not authorized to perform this action',
		)
	}

	// Step 2: Validate status input
	if (!Object.values(UserStatus).includes(status)) {
		throw new AppError(StatusCode.BAD_REQUEST, 'Invalid status value')
	}

	// Step 3: Check if target user exists
	const existingUser = await prisma.user.findUnique({
		where: { id },
	})
	if (!existingUser) {
		throw new AppError(StatusCode.NOT_FOUND, 'User not found')
	}

	// Step 4: Update user status
	const updatedUser = await prisma.user.update({
		where: { id },
		data: { status },
	})

	// Step 5: Return response without password
	const { password, ...userData } = updatedUser
	return userData
}

export const UserServices = {
	createAdminIntoDB,
	createPatientIntoDB,
	createDoctorIntoDB,
	getAllUsersFromDB,
	getMyProfileFromDB,
	changeProfileStatusIntoDB,
}
