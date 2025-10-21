import { z } from 'zod';

const createPatientValidationSchema = z.object({
	body: z.object({
		// Define validation schema here
	}),
});

export const PatientValidation = {
	createPatientValidationSchema,
};
