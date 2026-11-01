import type { Request, Response } from 'express';
import catchAsync from '@/shared/catchAsync';
import sendResponse from '@/shared/sendResponse';
import StatusCode from '@/utils/statusCode';
import { PrescriptionService } from './prescription.service';
import { pick } from '../../utils/prismaFilter';
import { prescriptionsFilterableFields } from './prescription.const';

const createPrescription = catchAsync(async (req: Request, res: Response) => {
  const result = await PrescriptionService.createPrescriptionIntoDB(req.user, req.body);

  sendResponse(res, {
    statusCode: StatusCode.CREATED,
    success: true,
    message: 'Prescription created successfully!',
    data: result,
  });
});

const getMyPrescriptions = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, prescriptionsFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'orderBy']);
  const prescriptions = await PrescriptionService.getMyPrescriptionsFromDB(
    req.user,
    filters,
    options
  );

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Prescriptions retrieved successfully!',
    data: prescriptions,
  });
});

const getSinglePrescription = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const prescription = await PrescriptionService.getSinglePrescriptionFromDB(req.user, id);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Prescription retrieved successfully!',
    data: prescription,
  });
});

const getMyFollowUps = catchAsync(async (req: Request, res: Response) => {
  const result = await PrescriptionService.getMyFollowUpsFromDB(req.user);
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Patient follow-up care records retrieved successfully!',
    data: result,
  });
});

const getDoctorDueFollowUps = catchAsync(async (req: Request, res: Response) => {
  const result = await PrescriptionService.getDoctorDueFollowUpsFromDB(req.user);
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Doctor follow-up compliance records retrieved successfully!',
    data: result,
  });
});

const bookFollowUpAppointment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { scheduleId } = req.body;
  const result = await PrescriptionService.bookFollowUpAppointmentInDB(req.user, id, scheduleId);

  sendResponse(res, {
    statusCode: StatusCode.CREATED,
    success: true,
    message: 'Follow-up appointment booked successfully!',
    data: result,
  });
});

export const PrescriptionController = {
  createPrescription,
  getMyPrescriptions,
  getSinglePrescription,
  getMyFollowUps,
  getDoctorDueFollowUps,
  bookFollowUpAppointment,
};
