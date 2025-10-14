import type { NextFunction, Request, Response } from 'express'
import { JWT } from '../utils/jwtToken'
import { envVars } from '../config/env'
import { prisma } from '../config/prisma.config'
import type { JwtPayload } from 'jsonwebtoken'
import AppError from '../helpers/AppError'
import StatusCode from '../utils/statusCode'
import { UserStatus } from '@prisma/client'

const checkAuth =
	(...authRoles: string[]) =>
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const accessToken =
				req?.headers?.authorization || req?.cookies?.accessToken

			if (!accessToken) {
				throw new Error('Token not received')
			}
			const tokenVerification = JWT.verifyToken(
				accessToken,
				envVars.JWT.ACCESS_TOKEN_SECRET,
			) as JwtPayload

			// check user exists
			const isUserExist = await prisma.user.findUnique({
				where: {
					email: tokenVerification.email,
				},
			})
			if (!isUserExist) {
				throw new AppError(StatusCode.BAD_REQUEST, 'User does not exist')
			}

			if (isUserExist.status === UserStatus.BLOCKED) {
				throw new AppError(StatusCode.BAD_REQUEST, 'User is BLOCKED')
			}

			// if (isUserExist.isDeleted) {
			// 	throw new AppError(httpStatus.BAD_REQUEST, 'user is removed')
			// }

			// if (!isUserExist.isVerified) {
			// 	throw new AppError(httpStatus.BAD_REQUEST, 'user is not verified')
			// }

			if (!authRoles.includes(tokenVerification.role)) {
				throw new AppError(StatusCode.FORBIDDEN, 'Access Denied')
			}

			req.user = tokenVerification
			next()
		} catch (error) {
			next(error)
		}
	}
export default checkAuth
