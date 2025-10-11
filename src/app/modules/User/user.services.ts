import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { ICreatePatientInput } from './user.interface'

import { envVars } from '../../config/env'
import { prisma } from '../../config/prisma.config'
import type { Request } from 'express'
import { uploadToCloudinary } from '../../config/cloudinary.config'

const createAdminIntoDB = async (req: Request) => {
	if (req.file) {
		// upload to cloudinary
		const result = await uploadToCloudinary(req.file)
	}

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
	if (req.file) {
		// upload to cloudinary
		const result = await uploadToCloudinary(req.file)
	}

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

export const UserServices = {
	createAdminIntoDB,
	createPatientIntoDB,
}
