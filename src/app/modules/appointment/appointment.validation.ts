import { z } from 'zod'

const createAppointmentValidationSchema = z.object({
	body: z.object({}),
})

export const AppointmentValidation = {
	createAppointmentValidationSchema,
}
