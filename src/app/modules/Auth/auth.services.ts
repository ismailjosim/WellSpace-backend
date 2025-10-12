import { UserStatus, type User } from '@prisma/client'
import { prisma } from '@/config/prisma.config'
import { passwordManage } from '@/utils/passwordManage'
import { JWT } from '@/utils/jwtToken'
import { envVars } from '@/config/env'

const loginIntoDB = async (payload: Partial<User>) => {
	const user = await prisma.user.findUniqueOrThrow({
		where: {
			email: payload.email,
			status: UserStatus.ACTIVE,
		},
	})

	// Check password
	const isCorrectPass = await passwordManage.checkingPassword(
		payload?.password as string,
		user.password,
	)

	if (!isCorrectPass) {
		throw new Error('Password is incorrect!')
	}

	// Generate tokens
	const tokenPayload = {
		userId: user.id,
		email: user.email,
		role: user.role,
	}

	const accessToken = JWT.generateToken(
		tokenPayload,
		envVars.JWT.ACCESS_TOKEN_SECRET,
		envVars.JWT.ACCESS_TOKEN_EXPIRES,
	)

	const refreshToken = JWT.generateToken(
		tokenPayload,
		envVars.JWT.REFRESH_TOKEN_SECRET,
		envVars.JWT.REFRESH_TOKEN_EXPIRES,
	)

	// Remove password before returning
	const { password, ...userWithoutPassword } = user

	return {
		accessToken,
		refreshToken,
		user: userWithoutPassword,
	}
}

export const AuthServices = {
	loginIntoDB,
}
