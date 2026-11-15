import { type Request, type Response } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import catchAsync from '@/shared/catchAsync';
import sendResponse from '@/shared/sendResponse';
import StatusCode from '@/utils/statusCode';
import { uploadPrivatePrescription } from '@/config/multer.config';
import { MedicineService } from './medicine.service';

const getMedicines = catchAsync(async (req: Request, res: Response) => {
  const result = await MedicineService.getMedicinesFromDB(req.query);
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Medicines retrieved successfully',
    data: result,
  });
});

const getManagedMedicines = catchAsync(async (_req: Request, res: Response) => {
  const result = await MedicineService.getManagedMedicinesFromDB();
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Shop inventory retrieved successfully',
    data: result,
  });
});

const getOverview = catchAsync(async (_req: Request, res: Response) => {
  const result = await MedicineService.getShopOverviewFromDB();
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Shop overview retrieved successfully',
    data: result,
  });
});

const createMedicine = catchAsync(async (req: Request, res: Response) => {
  const result = await MedicineService.createMedicineIntoDB(req);
  sendResponse(res, {
    statusCode: StatusCode.CREATED,
    success: true,
    message: 'Medicine added to the catalog',
    data: result,
  });
});

const updateMedicine = catchAsync(async (req: Request, res: Response) => {
  const result = await MedicineService.updateMedicineIntoDB(req.params.id as string, req);
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Medicine updated successfully',
    data: result,
  });
});

const deactivateMedicine = catchAsync(async (req: Request, res: Response) => {
  const result = await MedicineService.deactivateMedicineIntoDB(req.params.id as string);
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Medicine removed from the catalog',
    data: result,
  });
});

const updateStock = catchAsync(async (req: Request, res: Response) => {
  const result = await MedicineService.updateStockIntoDB(req.params.id as string, req.body);
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Inventory updated successfully',
    data: result,
  });
});

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const prescription = req.file ? await uploadPrivatePrescription(req.file) : undefined;
  const result = await MedicineService.createMedicineOrderIntoDB(
    req.user as JwtPayload,
    req.body,
    prescription
  );
  sendResponse(res, {
    statusCode: StatusCode.CREATED,
    success: true,
    message: 'Medicine order submitted for review',
    data: result,
  });
});

const getPrescriptionUrl = catchAsync(async (req: Request, res: Response) => {
  const result = await MedicineService.getPrescriptionUrlForOrder(
    req.params.id as string,
    req.user as JwtPayload
  );
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Secure prescription link generated',
    data: result,
  });
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await MedicineService.getMyMedicineOrdersFromDB(req.user as JwtPayload);
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Your medicine orders retrieved successfully',
    data: result,
  });
});

const getManagedOrders = catchAsync(async (_req: Request, res: Response) => {
  const result = await MedicineService.getManagedOrdersFromDB();
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Medicine orders retrieved successfully',
    data: result,
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await MedicineService.updateMedicineOrderStatusIntoDB(
    req.params.id as string,
    req.user as JwtPayload,
    req.body
  );
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Order status updated successfully',
    data: result,
  });
});

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await MedicineService.initiateMedicinePayment(
    req.params.id as string,
    req.user as JwtPayload
  );
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Medicine order payment session created',
    data: result,
  });
});

const verifyPayment = catchAsync(async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId;
  if (typeof sessionId !== 'string' || !sessionId) {
    return sendResponse(res, {
      statusCode: StatusCode.BAD_REQUEST,
      success: false,
      message: 'A Stripe session ID is required',
    });
  }

  const result = await MedicineService.verifyMedicinePaymentForPatient(
    sessionId,
    req.user as JwtPayload
  );
  sendResponse(res, {
    statusCode: StatusCode.OK,
    success: true,
    message: 'Medicine order payment status retrieved',
    data: result,
  });
});

export const MedicineController = {
  getMedicines,
  getManagedMedicines,
  getOverview,
  createMedicine,
  updateMedicine,
  deactivateMedicine,
  updateStock,
  createOrder,
  getPrescriptionUrl,
  getMyOrders,
  getManagedOrders,
  updateOrderStatus,
  initiatePayment,
  verifyPayment,
};
