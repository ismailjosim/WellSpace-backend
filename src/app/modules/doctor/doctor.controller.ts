import { type Request, type Response } from 'express';
import catchAsync from '@/shared/catchAsync';
import sendResponse from '@/shared/sendResponse';
import StatusCode from '@/utils/statusCode';
import { DoctorService } from './doctor.service';
import { pick } from '@/utils/prismaFilter';
import { doctorFilterableFields } from './doctor.constant';

const getAllDoctor = catchAsync(async (req: Request, res: Response) => {
  const queryOptions = pick(req.query, ['page', 'limit', 'sortBy', 'orderBy', 'sortOrder']);
  const options = {
    page: queryOptions.page as string | undefined,
    limit: queryOptions.limit as string | undefined,
    sortBy: queryOptions.sortBy as string | undefined,
    orderBy: (queryOptions.orderBy || queryOptions.sortOrder) as string | undefined,
  };
  const filters = pick(req.query, doctorFilterableFields);
  const result = await DoctorService.getAllDoctorFromDB(filters, options);

  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'All doctors retrieved successfully!',
    meta: result.meta,
    data: result.data,
  });
});

const updateProfileInfo = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await DoctorService.updateProfileInfoIntoDB(id, req.body);
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Doctor Profile Updated successfully!',
    data: result,
  });
});
const getSingleDoctorByID = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await DoctorService.getSingleDoctorByIDFromDB(id);
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Doctor info retrieved successfully!',
    data: result,
  });
});
const deleteDoctorByID = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await DoctorService.deleteDoctorByIDFromDB(id);
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Doctor Deleted successfully!',
    data: result,
  });
});

const getAISuggestion = catchAsync(async (req: Request, res: Response) => {
  const result = await DoctorService.getAISuggestionFromDB(req.body);
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'All doctors retrieved successfully!',
    data: {
      totalDoctors: result?.totalDoctors,
      recommendedDoctors: result.recommendedDoctors,
      reasoning: result.reasoning,
    },
  });
});

const uploadVerificationDocuments = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const licenseDoc = files?.['licenseDocument']?.[0]?.path;
    const degreeDoc = files?.['degreeDocument']?.[0]?.path;

    const result = await DoctorService.updateDoctorVerificationDocumentsIntoDB(req.user, {
      licenseDocument: licenseDoc || (req.body.licenseDocumentUrl as string),
      degreeDocument: degreeDoc || (req.body.degreeDocumentUrl as string),
    });

    sendResponse(res, {
      statusCode: StatusCode.OK,
      success: true,
      message: 'Medical verification documents submitted successfully. Status is now UNDER_REVIEW.',
      data: result,
    });
  }
);

const updateVerificationStatus = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const doctorId = req.params.id as string;
    const result = await DoctorService.updateDoctorVerificationStatusIntoDB(
      req.user,
      doctorId,
      req.body
    );

    sendResponse(res, {
      statusCode: StatusCode.OK,
      success: true,
      message: `Doctor verification status updated to ${req.body.status}`,
      data: result,
    });
  }
);

export const DoctorController = {
  getAllDoctor,
  updateProfileInfo,
  getSingleDoctorByID,
  deleteDoctorByID,
  getAISuggestion,
  uploadVerificationDocuments,
  updateVerificationStatus,
};
