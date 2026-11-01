import type { Request, Response } from 'express';
import catchAsync from '@/shared/catchAsync';
import sendResponse from '@/shared/sendResponse';
import StatusCode from '@/utils/statusCode';
import { ChatService } from './chat.service';

const getChatRoom = catchAsync(async (req: Request, res: Response) => {
  const { appointmentId } = req.params;
  const result = await ChatService.getOrCreateChatRoom(appointmentId, req.user);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Chat room retrieved successfully',
    data: result,
  });
});

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const { appointmentId } = req.params;
  const result = await ChatService.sendMessage(appointmentId, req.user, req.body);

  sendResponse(res, {
    statusCode: StatusCode.CREATED,
    success: true,
    message: 'Message sent successfully',
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const { appointmentId } = req.params;
  const result = await ChatService.markMessagesAsRead(appointmentId, req.user);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Messages marked as read',
    data: result,
  });
});

export const ChatController = {
  getChatRoom,
  sendMessage,
  markAsRead,
};
