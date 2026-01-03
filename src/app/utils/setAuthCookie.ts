import type { Response, CookieOptions } from 'express'
import { envVars } from '../config/env'

export type AuthToken = {
	accessToken?: string
	refreshToken?: string
}

type TimeUnit = 'y' | 'M' | 'w' | 'd' | 'h' | 'm' | 's'

const TIME_UNITS: Record<TimeUnit, number> = {
	y: 365 * 24 * 60 * 60 * 1000,
	M: 30 * 24 * 60 * 60 * 1000,
	w: 7 * 24 * 60 * 60 * 1000,
	d: 24 * 60 * 60 * 1000,
	h: 60 * 60 * 1000,
	m: 60 * 1000,
	s: 1000,
}

/**
 * Converts a time string (e.g., "7d", "1h", "30m") to milliseconds
 * @param timeString - Time string with format: number + unit (y|M|w|d|h|m|s)
 * @param defaultMs - Default value in milliseconds if parsing fails
 * @returns Time in milliseconds
 */
export const parseTimeToMs = (
	timeString: string,
	defaultMs: number,
): number => {
	if (!timeString || timeString.length < 2) return defaultMs

	const unit = timeString.slice(-1) as TimeUnit
	const value = parseInt(timeString.slice(0, -1), 10)

	if (isNaN(value) || !TIME_UNITS[unit]) return defaultMs

	return value * TIME_UNITS[unit]
}

/**
 * Gets default cookie options for authentication cookies
 * @param maxAge - Maximum age of the cookie in milliseconds
 * @returns Cookie options object
 */
const getAuthCookieOptions = (maxAge: number): CookieOptions => ({
	secure: envVars.NODE_ENV === 'production',
	httpOnly: true,
	sameSite: envVars.NODE_ENV === 'production' ? 'none' : 'lax',
	maxAge,
})

/**
 * Sets authentication cookies (access and refresh tokens)
 * @param res - Express response object
 * @param token - Object containing accessToken and/or refreshToken
 */
export const setAuthCookie = (res: Response, token: AuthToken): void => {
	const accessTokenExpiresIn = envVars.JWT.ACCESS_TOKEN_EXPIRES as string
	const refreshTokenExpiresIn = envVars.JWT.REFRESH_TOKEN_EXPIRES as string

	const accessTokenMaxAge = parseTimeToMs(
		accessTokenExpiresIn,
		60 * 60 * 1000, // default 1 hour
	)
	const refreshTokenMaxAge = parseTimeToMs(
		refreshTokenExpiresIn,
		30 * 24 * 60 * 60 * 1000, // default 30 days
	)

	if (token.accessToken) {
		res.cookie(
			'accessToken',
			token.accessToken,
			getAuthCookieOptions(accessTokenMaxAge),
		)
	}

	if (token.refreshToken) {
		res.cookie(
			'refreshToken',
			token.refreshToken,
			getAuthCookieOptions(refreshTokenMaxAge),
		)
	}
}

// /**
//  * Clears authentication cookies
//  * @param res - Express response object
//  */
// export const clearAuthCookies = (res: Response): void => {
// 	const cookieOptions: CookieOptions = {
// 		secure: envVars.NODE_ENV === 'production',
// 		httpOnly: true,
// 		sameSite: envVars.NODE_ENV === 'production' ? 'none' : 'lax',
// 	}

// 	res.clearCookie('accessToken', cookieOptions)
// 	res.clearCookie('refreshToken', cookieOptions)
// }
