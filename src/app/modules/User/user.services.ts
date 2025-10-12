import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '@/config/prisma.config'
import type { Request } from 'express'
import { envVars } from '@/config/env'

const createAdminIntoDB = async (req: Request) => {
	const hashedPassword: string = await bcrypt.hash(req.body.password, 12)

	const userData = {
		email: req.body.patient.email,
		password: hashedPassword,
		role: UserRole.ADMIN,
	}

	const result = await prisma.$transaction(async (transactionClient) => {
		await transactionClient.user.create({
			data: userData,
		})
		const createdAdminData = await transactionClient.admin.create({
			data: req.body.patient,
		})
		return createdAdminData
	})

	return result
}

const createPatientIntoDB = async (req: Request) => {
	const hashedPassword: string = await bcrypt.hash(
		req.body.password,
		Number(envVars.BCRYPT_SALT_ROUND),
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

export default createPatientIntoDB

export const UserServices = {
	createAdminIntoDB,
	createPatientIntoDB,
}
