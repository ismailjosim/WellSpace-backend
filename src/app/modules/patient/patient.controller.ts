import { type Request, type Response } from 'express';
import catchAsync from '@/shared/catchAsync';
import sendResponse from '@/shared/sendResponse';
import StatusCode from '@/utils/statusCode';
import { PatientService } from './patient.service';
import { pick } from '@/utils/prismaFilter';
import { patientFilterableFields } from './patient.constants';

/*
 * Get all patients (paginated & filterable)
 */
const getAllPatients = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, patientFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'orderBy']);

  const result = await PatientService.getAllPatientsFromDB(filters, options);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Patients retrieved successfully!',
    meta: result.meta,
    data: result.data,
  });
});

/*
 * Get a single patient by ID
 */
const getPatientByID = catchAsync(async (req: Request, res: Response) => {
  const result = await PatientService.getPatientByIDFromDB(req.params.id as string);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Patient info retrieved successfully!',
    data: result,
  });
});

const getMyHealthRecord = catchAsync(async (req: Request, res: Response) => {
  const result = await PatientService.getMyHealthRecordFromDB(req.user);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Health record retrieved successfully!',
    data: result,
  });
});

const updateMyHealthData = catchAsync(async (req: Request, res: Response) => {
  const result = await PatientService.updateMyHealthDataIntoDB(req.user, req.body);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Health data updated successfully!',
    data: result,
  });
});

const createMyMedicalReport = catchAsync(async (req: Request, res: Response) => {
  const result = await PatientService.createMyMedicalReportIntoDB(req.user, req);

  sendResponse(res, {
    statusCode: StatusCode.CREATED,
    success: true,
    message: 'Medical report uploaded successfully!',
    data: result,
  });
});

const deleteMyMedicalReport = catchAsync(async (req: Request, res: Response) => {
  const result = await PatientService.deleteMyMedicalReportFromDB(
    req.user,
    req.params.reportId as string
  );

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Medical report deleted successfully!',
    data: result,
  });
});

/*
 * Update a patient by ID
 */
const updatePatientInfoByID = catchAsync(async (req: Request, res: Response) => {
  const result = await PatientService.updatePatientInfoByIDIntoDB(req.user, req.body);
  console.log({ user: req.user, data: req.body });

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Patient info updated successfully!',
    data: result,
  });
});

/*
 * Soft delete a patient by ID
 */
const deletePatientByID = catchAsync(async (req: Request, res: Response) => {
  const result = await PatientService.deletePatientByIDFromDB(req.params.id as string);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Patient deleted successfully!',
    data: result,
  });
});

export const PatientController = {
  getAllPatients,
  getPatientByID,
  getMyHealthRecord,
  updateMyHealthData,
  createMyMedicalReport,
  deleteMyMedicalReport,
  updatePatientInfoByID,
  deletePatientByID,
};
