import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

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

export const UserServices = {
	createAdminIntoDB,
}
