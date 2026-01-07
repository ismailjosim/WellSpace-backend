import type { Request, Response } from 'express'
import StatusCode from '@/utils/statusCode'
import sendResponse from '@/shared/sendResponse'
import { AuthServices } from './auth.services'
import { setAuthCookie } from '@/utils/setAuthCookie'
import AppError from '@/helpers/AppError'
import catchAsync from '../../shared/catchAsync'

const login = async (req: Request, res: Response) => {
	const result = await AuthServices.loginIntoDB(req.body)
	setAuthCookie(res, {
		accessToken: result.accessToken,
		refreshToken: result.refreshToken,
	})
	sendResponse(res, {
		success: true,
		statusCode: StatusCode.OK,
		message: 'User logged in successfully',
		data: {
			...result,
		},
	})
}
const getMe = async (req: Request, res: Response) => {
	const userSession = req.cookies.accessToken

	const result = await AuthServices.getMeFromDB(userSession)

	sendResponse(res, {
		success: true,
		statusCode: StatusCode.OK,
		message: 'User profile retrieved in successfully',
		data: result,
	})
}

const refreshToken = async (req: Request, res: Response) => {
	const refreshToken = req.body.refreshToken || req.cookies.refreshToken
	if (!refreshToken) {
		throw new AppError(StatusCode.BAD_REQUEST, 'No Refresh Token received')
	}

	const loginInfo = await AuthServices.refreshTokenFromDB(refreshToken)

	setAuthCookie(res, loginInfo)

	sendResponse(res, {
		success: true,
		statusCode: StatusCode.CREATED,
		message: 'New Access Token Generate successfully',
		data: {
			accessToken: loginInfo.accessToken,
		},
	})
}

const changePassword = async (req: Request, res: Response) => {
	const { newPassword, oldPassword } = req.body
	const user = req.user
	await AuthServices.changePasswordIntoDB(oldPassword, newPassword, user)

	sendResponse(res, {
		success: true,
		statusCode: StatusCode.OK,
		message: 'Password reset Successfully',
		data: null,
	})
}
const forgetPassword = async (req: Request, res: Response) => {
	const result = await AuthServices.loginIntoDB(req.body)
	setAuthCookie(res, {
		accessToken: result.accessToken,
		refreshToken: result.refreshToken,
	})
	sendResponse(res, {
		success: true,
		statusCode: StatusCode.OK,
		message: 'User logged in successfully',
		data: {
			...result,
		},
	})
}
const resetPassword = catchAsync(
	async (req: Request & { user?: any }, res: Response) => {
		// Extract token from Authorization header (remove "Bearer " prefix)
		const authHeader = req.headers.authorization
		// console.log({ authHeader })
		const token = authHeader ? authHeader.replace('Bearer ', '') : null
		const user = req.user // Will be populated if authenticated via middleware

		await AuthServices.resetPasswordIntoDB(token, req.body, user)

		sendResponse(res, {
			success: true,
			statusCode: StatusCode.OK,
			message: 'Password Reset!',
			data: null,
		})
	},
)

export const AuthControllers = {
	login,
	refreshToken,
	changePassword,
	forgetPassword,
	resetPassword,
	getMe,
}
