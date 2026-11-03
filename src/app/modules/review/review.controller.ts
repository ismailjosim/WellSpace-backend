import type { Request, Response } from 'express';
import catchAsync from '@/shared/catchAsync';
import sendResponse from '@/shared/sendResponse';
import StatusCode from '@/utils/statusCode';
import AppError from '@/helpers/AppError';
import { ReviewService } from './review.service';
import { pick } from '@/utils/prismaFilter';

const getReviews = catchAsync(async (req: Request, res: Response) => {
  const doctorId = req.query.doctorId;
  if (typeof doctorId !== 'string' || !doctorId.trim()) {
    throw new AppError(StatusCode.BAD_REQUEST, 'A doctor ID is required');
  }

  const options = pick(req.query, ['page', 'limit']);
  const result = await ReviewService.getReviewsByDoctorFromDB(doctorId, {
    page: options.page as string | undefined,
    limit: options.limit as string | undefined,
  });

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Doctor reviews retrieved successfully!',
    data: result.data,
    meta: result.meta,
  });
});

const createReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.createReviewIntoDB(req.user, req.body);

  sendResponse(res, {
    statusCode: StatusCode.CREATED,
    success: true,
    message: 'Review created successfully!',
    data: result,
  });
});

export const ReviewController = {
  getReviews,
  createReview,
};
