import type { Request, Response } from 'express'
import StatusCode from '@/utils/statusCode'
import sendResponse from '@/shared/sendResponse'
import { AuthServices } from './auth.services'
import { setAuthCookie } from '@/utils/setAuthCookie'
import AppError from '../../helpers/AppError'
import type { JwtPayload } from 'jsonwebtoken'

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
const setPassword = async (req: Request, res: Response) => {
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

export const AuthControllers = {
	login,
	refreshToken,
	changePassword,
	forgetPassword,
	setPassword,
}
