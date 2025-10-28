import { z } from 'zod';

const createPaymentValidationSchema = z.object({
	body: z.object({
		// Define validation schema here
	}),
});

export const PaymentValidation = {
	createPaymentValidationSchema,
};
