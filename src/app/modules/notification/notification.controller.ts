import type { Request, Response } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import catchAsync from '@/shared/catchAsync';
import sendResponse from '@/shared/sendResponse';
import StatusCode from '@/utils/statusCode';
import { pick } from '@/utils/prismaFilter';
import { NotificationService } from './notification.service';
import { notificationFilterableFields } from './notification.constants';
import { NotificationStream } from './notification.stream';

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const options = pick(req.query, ['page', 'limit', 'sortBy', 'orderBy']);
  const filters = pick(req.query, notificationFilterableFields);

  console.log('[Notification Controller] getMyNotifications', {
    userId: user.userId,
    options,
    filters,
  });

  const result = await NotificationService.getMyNotificationsFromDB(user, options, filters);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Notifications retrieved successfully',
    meta: result.meta,
    data: {
      unreadCount: result.unreadCount,
      notifications: result.data,
    },
  });
});

const markNotificationAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const { id } = req.params;
  const result = await NotificationService.markNotificationAsReadIntoDB(user, id);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

const markAllNotificationsAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await NotificationService.markAllNotificationsAsReadIntoDB(user);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Notifications marked as read',
    data: result,
  });
});

const streamMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  NotificationStream.addClient(user.userId, res);
});

export const NotificationController = {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  streamMyNotifications,
};
