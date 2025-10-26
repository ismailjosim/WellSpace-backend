import { z } from 'zod';

const createAppointmentValidationSchema = z.object({
	body: z.object({
		// Define validation schema here
	}),
});

export const AppointmentValidation = {
	createAppointmentValidationSchema,
};
