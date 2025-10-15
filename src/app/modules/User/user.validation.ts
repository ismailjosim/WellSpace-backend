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

const createAdminValidationSchema = z.object({
	password: z.string().nonempty('Password is required'),
	admin: z.object({
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
		contactNumber: z.string({
			error: 'Contact number is required',
		}),
	}),
})
const createDoctorValidationSchema = z.object({
	password: z.string().nonempty('Password is required'),
	doctor: z.object({
		name: z
			.string({ error: 'Name is required' })
			.min(1, 'Name cannot be empty'),
		email: z
			.string({ error: 'Email is required' })
			.email('Invalid email format'),
		profilePhoto: z.string().optional(),
		contactNumber: z
			.string({ error: 'Contact number is required' })
			.min(1, 'Contact number cannot be empty'),
		address: z
			.string({ error: 'Address is required' })
			.min(1, 'Address cannot be empty'),
		registrationNumber: z
			.string({ error: 'Registration number is required' })
			.min(1, 'Registration number cannot be empty'),
		experience: z
			.number({ error: 'Experience must be a number' })
			.int('Experience must be an integer'),
		gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
			error: 'Gender is required',
		}),
		appointmentFee: z
			.number({ error: 'Appointment fee must be a number' })
			.int(),
		qualification: z.string({ error: 'Qualification is required' }).min(1),
		currentWorkingPlace: z
			.string({ error: 'Current working place is required' })
			.min(1),
		designation: z.string({ error: 'Designation is required' }).min(1),
	}),
})

export const UserValidationSchema = {
	createPatientValidationSchema,
	createAdminValidationSchema,
	createDoctorValidationSchema,
}
