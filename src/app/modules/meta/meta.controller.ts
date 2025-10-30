import type { Request, Response } from 'express'
import catchAsync from '@/shared/catchAsync'
import sendResponse from '@/shared/sendResponse'
import StatusCode from '@/utils/statusCode'
import { MetaService } from './meta.service'

const fetchDashboardMetaData = catchAsync(
	async (req: Request, res: Response) => {
		const result = await MetaService.fetchDashboardMetaDataFromDB(req.user)

		sendResponse(res, {
			statusCode: StatusCode.OK,
			success: true,
			message: 'Metadata retrieved successfully!',
			data: result,
		})
	},
)

export const MetaController = {
	fetchDashboardMetaData,
}
