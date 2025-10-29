import { UserStatus, type User } from '@prisma/client'
import { prisma } from '@/config/prisma.config'
import { passwordManage } from '@/utils/passwordManage'
import { JWT } from '@/utils/jwtToken'
import { envVars } from '@/config/env'
import AppError from '../../helpers/AppError'
import StatusCode from '../../utils/statusCode'
import type { JwtPayload } from 'jsonwebtoken'
import { sendMail } from '../../utils/sendEmail'

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
const refreshTokenFromDB = async (token: string) => {
	let decodedData
	try {
		decodedData = JWT.verifyToken(token, envVars.JWT.REFRESH_TOKEN_SECRET)
	} catch (err) {
		throw new AppError(StatusCode.BAD_REQUEST, 'You are not authorized')
	}

	const userData = await prisma.user.findUniqueOrThrow({
		where: {
			email: decodedData.email,
			status: UserStatus.ACTIVE,
		},
	})

	const tokenPayload = {
		userId: userData.id,
		email: userData.email,
		role: userData.role,
	}

	const accessToken = JWT.generateToken(
		tokenPayload,
		envVars.JWT.ACCESS_TOKEN_SECRET,
		envVars.JWT.ACCESS_TOKEN_EXPIRES,
	)

	return { accessToken }
}
const changePasswordIntoDB = async (
	oldPassword: string,
	newPassword: string,
	user: JwtPayload,
) => {
	// 1️⃣ Find user by email
	const userData = await prisma.user.findUniqueOrThrow({
		where: {
			email: user.email,
			status: UserStatus.ACTIVE,
		},
	})

	// 2️⃣ Verify old password
	const isCorrectPass: boolean = await passwordManage.checkingPassword(
		oldPassword,
		userData.password,
	)

	if (!isCorrectPass) {
		throw new AppError(StatusCode.UNAUTHORIZED, "Old Password doesn't match")
	}

	// 3️⃣ Check that new password is not same as old
	if (oldPassword === newPassword) {
		throw new AppError(
			StatusCode.BAD_REQUEST,
			'New Password must be different from Old Password',
		)
	}

	// 4️⃣ Prevent password from including email
	if (newPassword.includes(user.email)) {
		throw new AppError(
			StatusCode.BAD_REQUEST,
			'Password cannot include user email',
		)
	}

	// 5️⃣ Hash new password
	const hashedNewPassword = await passwordManage.hashingPassword(newPassword)

	// 6️⃣ Update user password in DB
	await prisma.user.update({
		where: { id: userData.id },
		data: {
			password: hashedNewPassword,
			needPasswordChange: false,
		},
	})

	return {
		message: 'Password updated successfully',
	}
}
const forgetPasswordIntoDB = async (payload: { email: string }) => {
	const userData = await prisma.user.findUniqueOrThrow({
		where: {
			email: payload.email,
			status: UserStatus.ACTIVE,
		},
	})
	const tokenPayload = {
		userId: userData.id,
		email: userData.email,
		role: userData.role,
	}

	const resetPasswordToken = JWT.generateToken(
		tokenPayload,
		envVars.JWT.ACCESS_TOKEN_SECRET,
		'5m',
	)

	const resetUILink = `${envVars.FRONTEND_URL}/reset-password?id=${userData.id}&token=${resetPasswordToken}`

	sendMail({
		to: userData.email,
		subject: 'Password Reset',
		templateName: 'forgetPassword',
		templateData: {
			name: 'User',
			resetUILink,
		},
	})

	return null
}
const setPasswordIntoDB = async (payload: Partial<User>) => {
	return null
}
const getMeFromDB = async (userSession: any) => {
	const decodedToken = JWT.verifyToken(
		userSession,
		envVars.JWT.ACCESS_TOKEN_SECRET,
	)
	const userData = await prisma.user.findUniqueOrThrow({
		where: {
			email: decodedToken.email,
			status: UserStatus.ACTIVE,
		},
	})

	const { email, role, id, needPasswordChange, status, createdAt, updatedAt } =
		userData

	return {
		email,
		role,
		id,
		needPasswordChange,
		status,
		createdAt,
		updatedAt,
	}
}

export const AuthServices = {
	loginIntoDB,
	refreshTokenFromDB,
	changePasswordIntoDB,
	forgetPasswordIntoDB,
	setPasswordIntoDB,
	getMeFromDB,
}
