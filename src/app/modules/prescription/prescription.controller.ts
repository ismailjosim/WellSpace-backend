import type { Request, Response } from 'express'
import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import StatusCode from '@/utils/statusCode'
import { PrescriptionService } from './prescription.service'

const createPrescription = catchAsync(async (req: Request, res: Response) => {
	const result = await PrescriptionService.createPrescriptionIntoDB(
		req.user,
		req.body,
	)

	sendResponse(res, {
		statusCode: StatusCode.CREATED,
		success: true,
		message: 'Prescription created successfully!',
		data: result,
	})
})

const getMyPrescriptions = catchAsync(async (req: Request, res: Response) => {
	const prescriptions = await PrescriptionService.getMyPrescriptions(req.user)

	sendResponse(res, {
		statusCode: StatusCode.OK,
		success: true,
		message: 'Prescriptions retrieved successfully!',
		data: prescriptions,
	})
})

export const PrescriptionController = {
	createPrescription,
	getMyPrescriptions,
}
