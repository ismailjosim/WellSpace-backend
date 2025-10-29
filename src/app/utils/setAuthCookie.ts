import type { Response } from 'express'

export type AuthToken = {
	accessToken?: string
	refreshToken?: string
}

export const setAuthCookie = (res: Response, token: AuthToken) => {
	if (token.accessToken) {
		res.cookie('accessToken', token.accessToken, {
			secure: false, // TODO: make true before deploy
			httpOnly: true,
			sameSite: 'lax', // todo: make none
			maxAge: 1000 * 60 * 60,
		})
	}
	if (token.refreshToken) {
		res.cookie('refreshToken', token.refreshToken, {
			secure: false, // TODO: make true before deploy
			httpOnly: true,
			sameSite: 'lax', // todo: make none
			maxAge: 1000 * 60 * 60 * 24 * 90,
		})
	}
}
