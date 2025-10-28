import { z } from 'zod';

const createPrescriptionValidationSchema = z.object({
	body: z.object({
		// Define validation schema here
	}),
});

export const PrescriptionValidation = {
	createPrescriptionValidationSchema,
};
