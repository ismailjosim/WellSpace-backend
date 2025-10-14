import type { Request, Response } from 'express'
import StatusCode from '@/utils/statusCode'
import sendResponse from '@/shared/sendResponse'
import { AuthServices } from './auth.services'
import { setAuthCookie } from '@/utils/setAuthCookie'

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

export const AuthControllers = {
	login,
}
