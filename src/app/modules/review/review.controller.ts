import type { Request, Response } from 'express'
import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import StatusCode from '@/utils/statusCode'
import { ReviewService } from './review.service'

const createReview = catchAsync(async (req: Request, res: Response) => {
	const result = await ReviewService.createReviewIntoDB(req.user, req.body)

	sendResponse(res, {
		statusCode: StatusCode.CREATED,
		success: true,
		message: 'Review created successfully!',
		data: result,
	})
})

export const ReviewController = {
	createReview,
}
