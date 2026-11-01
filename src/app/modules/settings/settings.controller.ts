import type { Request, Response } from 'express';
import catchAsync from '@/shared/catchAsync';
import sendResponse from '@/shared/sendResponse';
import StatusCode from '@/utils/statusCode';
import { SettingsService } from './settings.service';

const getPublicSettings = catchAsync(async (_req: Request, res: Response) => {
  const result = await SettingsService.getPublicSettingsFromDB();
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Public platform settings retrieved successfully',
    data: result,
  });
});

const getAllSettings = catchAsync(async (_req: Request, res: Response) => {
  const result = await SettingsService.getAllSettingsFromDB();
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'All platform settings retrieved successfully',
    data: result,
  });
});

const updateSettings = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await SettingsService.updateSettingsInDB(req.user, req.body);
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Platform settings updated successfully',
    data: result,
  });
});

export const SettingsController = {
  getPublicSettings,
  getAllSettings,
  updateSettings,
};
