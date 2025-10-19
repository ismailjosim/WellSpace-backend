import { z } from 'zod';

const createDoctorValidationSchema = z.object({
	body: z.object({
		// Define validation schema here
	}),
});

export const DoctorValidation = {
	createDoctorValidationSchema,
};
