import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { ICreatePatientInput } from './user.interface'
import dotenv from '../../../config/index'
import { prisma } from '../../shared/prisma'

const createAdminIntoDB = async (payload: any) => {
	const hashedPassword: string = await bcrypt.hash(payload.password, 12)

	const userData = {
		email: payload.admin.email,
		password: hashedPassword,
		role: UserRole.ADMIN,
	}

	const result = await prisma.$transaction(async (transactionClient) => {
		await transactionClient.user.create({
			data: userData,
		})
		const createdAdminData = await transactionClient.admin.create({
			data: payload.admin,
		})
		return createdAdminData
	})

	return result
}
const createPatientIntoDB = async (payload: ICreatePatientInput) => {
	const hashedPassword: string = await bcrypt.hash(
		payload.password,
		Number(dotenv.bcrypt_salt),
	)

	const result = await prisma.$transaction(async (transactionClient) => {
		await transactionClient.user.create({
			data: {
				email: payload.email,
				password: hashedPassword,
			},
		})
		return await transactionClient.patient.create({
			data: {
				name: payload.name,
				email: payload.email,
			},
		})
	})

	return result
}

export const UserServices = {
	createAdminIntoDB,
	createPatientIntoDB,
}
