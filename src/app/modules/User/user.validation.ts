import { z } from 'zod'

const createPatientValidationSchema = z.object({
	password: z.string().nonempty('Password is required'),
	patient: z.object({
		name: z
			.string({
				error: 'name is required',
			})
			.min(1, 'Name cannot be empty'),
		email: z
			.string({
				error: 'Email is required',
			})
			.email('Invalid email format'),
		address: z.string().optional(),
	}),
})

export const UserValidationSchema = {
	createPatientValidationSchema,
}
