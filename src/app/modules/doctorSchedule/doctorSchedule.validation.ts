import { z } from 'zod'

const createDoctorScheduleValidationSchema = z.object({
	scheduleIds: z
		.array(
			z.string().uuid({
				message: 'Each scheduleId must be a valid UUID',
			}),
		)
		.nonempty({
			message: 'At least one scheduleId is required',
		}),
})

export const DoctorScheduleValidation = {
	createDoctorScheduleValidationSchema,
}
