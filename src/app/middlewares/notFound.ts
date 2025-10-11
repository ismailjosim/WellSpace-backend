import HttpStatus from 'http-status'
import type { NextFunction, Request, Response } from 'express'

const notFound = (req: Request, res: Response, next: NextFunction) => {
	res.status(HttpStatus.NOT_FOUND).json({
		success: false,
		message: 'API NOT FOUND!',
		error: {
			path: req.originalUrl,
			message: 'Your requested path is not found!',
		},
	})
}
export default notFound
