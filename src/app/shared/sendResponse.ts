import { type Response } from 'express'

export interface IResponse<T> {
	statusCode: number
	success: boolean
	message: string
	meta?: {
		page: number
		limit: number
		total: number
	}
	data?: T | null
}

const sendResponse = <T>(res: Response, jsonData: IResponse<T>): void => {
	const { statusCode, success, message, meta, data } = jsonData

	res.status(statusCode).json({
		success,
		message,
		...(meta && { meta }),
		data: data ?? null,
	})
}

export default sendResponse
