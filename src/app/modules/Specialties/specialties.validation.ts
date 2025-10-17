import z from 'zod'

const createSpecialtyValidationSchema = z.object({
	title: z.string({
		error: 'Title is required',
	}),
})

export const SpecialtiesValidation = {
	createSpecialtyValidationSchema,
}
