import type { NextFunction, Request, Response } from 'express'
import type { ZodObject } from 'zod'

const validateRequest = (schema: ZodObject) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			// console.log(req.body.data)
			if (req.body.data) {
				req.body = JSON.parse(req.body.data)
			}
			await schema.parseAsync(req.body)
			next()
		} catch (error) {
			next(error)
		}
	}
}

export default validateRequest
