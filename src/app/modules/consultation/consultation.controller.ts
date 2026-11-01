import type { Request, Response } from 'express';
import catchAsync from '@/shared/catchAsync';
import sendResponse from '@/shared/sendResponse';
import StatusCode from '@/utils/statusCode';
import { ConsultationService } from './consultation.service';

const getSession = catchAsync(async (req: Request, res: Response) => {
  const { appointmentId } = req.params;
  const result = await ConsultationService.getOrCreateSession(appointmentId, req.user);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Consultation session initialized',
    data: result,
  });
});

const endSession = catchAsync(async (req: Request, res: Response) => {
  const { appointmentId } = req.params;
  const { notes } = req.body;
  const result = await ConsultationService.endSession(appointmentId, req.user, notes);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Consultation session ended successfully',
    data: result,
  });
});

const saveNotes = catchAsync(async (req: Request, res: Response) => {
  const { appointmentId } = req.params;
  const { notes } = req.body;
  const result = await ConsultationService.saveNotes(appointmentId, req.user, notes);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Consultation notes updated',
    data: result,
  });
});

export const ConsultationController = {
  getSession,
  endSession,
  saveNotes,
};
