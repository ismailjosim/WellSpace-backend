import { z } from 'zod'

const createScheduleValidationSchema = z
	.object({
		startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
			message: 'Invalid startDate format (expected YYYY-MM-DD)',
		}),
		endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
			message: 'Invalid endDate format (expected YYYY-MM-DD)',
		}),
		startTime: z
			.string()
			.regex(
				/^([0-1]\d|2[0-3]):([0-5]\d)$/,
				'Invalid startTime format (expected HH:mm)',
			),
		endTime: z
			.string()
			.regex(
				/^([0-1]\d|2[0-3]):([0-5]\d)$/,
				'Invalid endTime format (expected HH:mm)',
			),
	})
	.refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
		message: 'endDate must be same or after startDate',
		path: ['endDate'],
	})
	.refine(
		(data) => {
			if (data.startDate === data.endDate) {
				return data.startTime < data.endTime
			}
			return true
		},
		{
			message: 'endTime must be after startTime when on same day',
			path: ['endTime'],
		},
	)

export const ScheduleValidation = {
	createScheduleValidationSchema,
}
