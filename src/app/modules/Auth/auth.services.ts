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
const resetPasswordIntoDB = async (
	token: string | null,
	payload: { email?: string; password: string },
	user?: { email: string },
) => {
	let userEmail: string

	// Case 1: Token-based reset (from forgot password email)
	if (token) {
		const decodedToken = JWT.verifyToken(token, envVars.JWT.ACCESS_TOKEN_SECRET)

		if (!decodedToken) {
			throw new AppError(
				StatusCode.FORBIDDEN,
				'Invalid or expired reset token!',
			)
		}

		// Verify email from token matches the email in payload
		if (payload.email && decodedToken.email !== payload.email) {
			throw new AppError(
				StatusCode.FORBIDDEN,
				'Email mismatch! Invalid reset request.',
			)
		}

		userEmail = decodedToken.email
	}
	// Case 2: Authenticated user with needPasswordChange (newly created admin/doctor)
	else if (user && user.email) {
		console.log({ user }, 'needPasswordChange')
		const authenticatedUser = await prisma.user.findUniqueOrThrow({
			where: {
				email: user.email,
				status: UserStatus.ACTIVE,
			},
		})

		// Verify user actually needs password change
		if (!authenticatedUser.needPasswordChange) {
			throw new AppError(
				StatusCode.BAD_REQUEST,
				"You don't need to reset your password. Use change password instead.",
			)
		}

		userEmail = user.email
	} else {
		throw new AppError(
			StatusCode.BAD_REQUEST,
			'Invalid request. Either provide a valid token or be authenticated.',
		)
	}

	// hash password
	// Check password
	const password = await passwordManage.hashingPassword(
		payload?.password as string,
	)

	// update into database
	await prisma.user.update({
		where: {
			email: userEmail,
		},
		data: {
			password,
			needPasswordChange: false,
		},
	})
}
const getMeFromDB = async (userSession: any) => {
	const decodedData = JWT.verifyToken(
		userSession,
		envVars.JWT.ACCESS_TOKEN_SECRET,
	)
	const userData = await prisma.user.findUniqueOrThrow({
		where: {
			email: decodedData.email,
			status: UserStatus.ACTIVE,
		},
		select: {
			id: true,
			email: true,
			role: true,
			needPasswordChange: true,
			status: true,
			createdAt: true,
			updatedAt: true,
			admin: {
				select: {
					id: true,
					name: true,
					email: true,
					profilePhoto: true,
					contactNumber: true,
					isDeleted: true,
					createdAt: true,
					updatedAt: true,
				},
			},
			doctor: {
				select: {
					id: true,
					name: true,
					email: true,
					profilePhoto: true,
					contactNumber: true,
					address: true,
					registrationNumber: true,
					experience: true,
					gender: true,
					appointmentFee: true,
					qualification: true,
					currentWorkingPlace: true,
					designation: true,
					averageRating: true,
					isDeleted: true,
					createdAt: true,
					updatedAt: true,
					doctorSpecialties: {
						include: {
							specialties: true,
						},
					},
				},
			},
			patient: {
				select: {
					id: true,
					name: true,
					email: true,
					profilePhoto: true,
					contactNumber: true,
					address: true,
					isDeleted: true,
					createdAt: true,
					updatedAt: true,
					patientHealthData: true,
				},
			},
		},
	})
	return userData
}

export const AuthServices = {
	loginIntoDB,
	refreshTokenFromDB,
	changePasswordIntoDB,
	forgetPasswordIntoDB,
	resetPasswordIntoDB,
	getMeFromDB,
}
