import type { NextFunction, Request, Response } from 'express'
import HttpStatus from 'http-status'

const globalErrorHandler = (
	err: any,
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
	let success = false
	let message = err.message || 'Something went wrong!'
	let error = err
	res.status(statusCode).json({
		success,
		message,
		error,
	})
}

export default globalErrorHandler
