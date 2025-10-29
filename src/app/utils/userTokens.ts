import { envVars } from '../config/env'
import { JWT } from './jwtToken'
import { prisma } from '../config/prisma.config'
import httpStatus from 'http-status'

import { UserRole } from '@prisma/client'
import type { JwtPayload } from 'jsonwebtoken'
import AppError from '../helpers/AppError'

// 🧾 Create access & refresh tokens for a user
export const createUserToken = (user: {
	id: string
	email: string
	role: UserRole
}) => {
	// Token payload
	const tokenPayload = {
		userId: user.id,
		email: user.email,
		role: user.role,
	}

	// Generate access token
	const accessToken = JWT.generateToken(
		tokenPayload,
		envVars.JWT.ACCESS_TOKEN_SECRET,
		envVars.JWT.ACCESS_TOKEN_EXPIRES,
	)

	// Generate refresh token
	const refreshToken = JWT.generateToken(
		tokenPayload,
		envVars.JWT.REFRESH_TOKEN_SECRET,
		envVars.JWT.REFRESH_TOKEN_EXPIRES,
	)

	return { accessToken, refreshToken }
}

// 🔄 Generate new access token using refresh token
export const createNewAccessTokenWithRefreshToken = async (
	ParamsRefreshToken: string,
) => {
	// Verify the refresh token
	const verifyRefreshToken = JWT.verifyToken(
		ParamsRefreshToken,
		envVars.JWT.REFRESH_TOKEN_SECRET,
	) as JwtPayload

	// ✅ Check if user exists in Postgres via Prisma
	const isUserExist = await prisma.user.findUniqueOrThrow({
		where: {
			email: verifyRefreshToken.email,
		},
	})

	if (!isUserExist) {
		throw new AppError(httpStatus.BAD_REQUEST, "This user doesn't exist")
	}

	// 🧾 Payload for new token
	const tokenPayload = {
		userId: isUserExist.id,
		email: isUserExist.email,
		role: isUserExist.role,
	}

	// 🔑 Generate new access token
	const accessToken = JWT.generateToken(
		tokenPayload,
		envVars.JWT.ACCESS_TOKEN_SECRET,
		envVars.JWT.ACCESS_TOKEN_EXPIRES,
	)

	return accessToken
}
