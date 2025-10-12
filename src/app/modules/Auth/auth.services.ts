import { UserStatus, type User } from '@prisma/client'
import { prisma } from '@/config/prisma.config'
import { passwordManage } from '../../utils/passwordManage'

const loginIntoDB = async (payload: Partial<User>) => {
	const user = await prisma.user.findUniqueOrThrow({
		where: {
			email: payload.email,
			status: UserStatus.ACTIVE,
		},
	})

	// checking pass
	const isCorrectPass = await passwordManage.checkingPassword(
		payload?.password as string,
		user.password,
	)
	console.log(isCorrectPass)
	if (!isCorrectPass) {
		throw new Error('Password is incorrect!')
	}

	return 'result'
}

export const AuthServices = {
	loginIntoDB,
}
