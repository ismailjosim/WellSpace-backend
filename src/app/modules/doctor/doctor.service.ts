import { prisma } from '@/config/prisma.config'
import { paginationHelper, type IOptions } from '@/utils/paginationHelper'
import { buildWhereCondition } from '@/utils/prismaFilter'
import type { Prisma } from '@prisma/client'
import type { IDoctorUpdateInput } from './doctor.interface'
import AppError from '@/helpers/AppError'
import StatusCode from '@/utils/statusCode'
import { doctorSearchableFields } from './doctor.constant'
import openAIConfig from '../../config/openRouter.config'

/*
 * Get all doctors (paginated & filterable)
 */
const getAllDoctorFromDB = async (filters: any, options: IOptions) => {
	const { page, limit, skip, sortBy, orderBy } =
		paginationHelper.calcPagination(options)

	const { searchTerm, specialties, ...filterData } = filters

	const andConditions: Prisma.DoctorWhereInput[] = []

	if (searchTerm) {
		andConditions.push({
			OR: doctorSearchableFields.map((field) => ({
				[field]: {
					contains: searchTerm,
					mode: 'insensitive',
				},
			})),
		})
	}

	// doctor -> doctor specialties -> specialties -> title
	// handle multiple specialties: ?specialties=spec1&specialties=spec2
	if (specialties && specialties.length > 0) {
		// Convert to array if single string
		const specialtiesArray = Array.isArray(specialties)
			? specialties
			: [specialties]

		andConditions.push({
			doctorSpecialties: {
				some: {
					specialties: {
						title: {
							in: specialtiesArray,
							mode: 'insensitive',
						},
					},
				},
			},
		})
	}

	if (Object.keys(filterData).length > 0) {
		const filterConditions = Object.keys(filterData).map((key) => ({
			[key]: {
				equals: (filterData as any)[key],
			},
		}))
		andConditions.push(...filterConditions)
	}

	andConditions.push({
		isDeleted: false,
	})

	const whereConditions: Prisma.DoctorWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {}

	const result = await prisma.doctor.findMany({
		where: whereConditions,
		skip,
		take: limit,
		orderBy:
			options.sortBy && options.sortBy
				? { [options.sortBy]: options.orderBy }
				: { averageRating: 'desc' },
		include: {
			doctorSpecialties: {
				include: {
					specialties: {
						select: {
							title: true,
						},
					},
				},
			},
			doctorSchedules: {
				include: {
					schedule: true,
				},
			},
			reviews: {
				select: {
					rating: true,
				},
			},
		},
	})
	const total = await prisma.doctor.count({
		where: whereConditions,
	})
	return {
		meta: {
			total,
			page,
			limit,
		},
		data: result,
	}
}

/*
 * Update doctor profile info (atomic with transaction)
 */
const updateProfileInfoIntoDB = async (
	id: string,
	payload: IDoctorUpdateInput,
) => {
	const { specialties, removeSpecialties, ...doctorData } = payload

	const doctorInfo = await prisma.doctor.findUniqueOrThrow({
		where: {
			id,
			isDeleted: false,
		},
	})

	await prisma.$transaction(async (transactionClient) => {
		// Step 1: Update doctor basic data
		if (Object.keys(doctorData).length > 0) {
			await transactionClient.doctor.update({
				where: {
					id,
				},
				data: doctorData,
			})
		}

		// Step 2: Remove specialties if provided
		if (
			removeSpecialties &&
			Array.isArray(removeSpecialties) &&
			removeSpecialties.length > 0
		) {
			// Validate that specialties to remove exist for this doctor
			const existingDoctorSpecialties =
				await transactionClient.doctorSpecialties.findMany({
					where: {
						doctorId: doctorInfo.id,
						specialtiesId: {
							in: removeSpecialties,
						},
					},
				})

			if (existingDoctorSpecialties.length !== removeSpecialties.length) {
				const foundIds = existingDoctorSpecialties.map((ds) => ds.specialtiesId)
				const notFound = removeSpecialties.filter(
					(id) => !foundIds.includes(id),
				)
				throw new Error(
					`Cannot remove non-existent specialties: ${notFound.join(', ')}`,
				)
			}

			// Delete the specialties
			await transactionClient.doctorSpecialties.deleteMany({
				where: {
					doctorId: doctorInfo.id,
					specialtiesId: {
						in: removeSpecialties,
					},
				},
			})
		}

		// Step 3: Add new specialties if provided
		if (specialties && Array.isArray(specialties) && specialties.length > 0) {
			// Verify all specialties exist in Specialties table
			const existingSpecialties = await transactionClient.specialties.findMany({
				where: {
					id: {
						in: specialties,
					},
				},
				select: {
					id: true,
				},
			})

			const existingSpecialtyIds = existingSpecialties.map((s) => s.id)
			const invalidSpecialties = specialties.filter(
				(id) => !existingSpecialtyIds.includes(id),
			)

			if (invalidSpecialties.length > 0) {
				throw new Error(
					`Invalid specialty IDs: ${invalidSpecialties.join(', ')}`,
				)
			}

			// Check for duplicates - don't add specialties that already exist
			const currentDoctorSpecialties =
				await transactionClient.doctorSpecialties.findMany({
					where: {
						doctorId: doctorInfo.id,
						specialtiesId: {
							in: specialties,
						},
					},
					select: {
						specialtiesId: true,
					},
				})

			const currentSpecialtyIds = currentDoctorSpecialties.map(
				(ds) => ds.specialtiesId,
			)
			const newSpecialties = specialties.filter(
				(id) => !currentSpecialtyIds.includes(id),
			)

			// Only create new specialties that don't already exist
			if (newSpecialties.length > 0) {
				const doctorSpecialtiesData = newSpecialties.map((specialtyId) => ({
					doctorId: doctorInfo.id,
					specialtiesId: specialtyId,
				}))

				await transactionClient.doctorSpecialties.createMany({
					data: doctorSpecialtiesData,
				})
			}
		}
	})

	// Step 4: Return updated doctor with specialties
	const result = await prisma.doctor.findUnique({
		where: {
			id: doctorInfo.id,
		},
		include: {
			doctorSpecialties: {
				include: {
					specialties: true,
				},
			},
		},
	})

	return result
}

/*
 * Get single doctor by ID
 */
const getSingleDoctorByIDFromDB = async (id: string) => {
	const doctor = await prisma.doctor.findUnique({
		where: { id, isDeleted: false },
		include: {
			doctorSpecialties: {
				include: {
					specialties: true,
				},
			},
			doctorSchedules: {
				include: {
					schedule: true,
				},
			},
			reviews: true,
		},
	})

	if (!doctor || doctor.isDeleted) {
		throw new AppError(StatusCode.NOT_FOUND, 'Doctor not found')
	}

	return {
		...doctor,
		doctorSpecialties: doctor.doctorSpecialties.map((ds) => ({
			id: ds.specialties.id,
			title: ds.specialties.title,
			icon: ds.specialties.icon,
		})),
	}
}

/*
 * Soft delete doctor by ID
 */
const deleteDoctorByIDFromDB = async (id: string) => {
	const existingDoctor = await prisma.doctor.findUnique({
		where: { id },
	})

	if (!existingDoctor || existingDoctor.isDeleted) {
		throw new AppError(StatusCode.NOT_FOUND, 'Doctor not found')
	}

	// Soft delete
	const updatedDoctor = await prisma.doctor.update({
		where: { id },
		data: { isDeleted: true },
	})

	return updatedDoctor
}

/*
 * Get AI suggested Doctors
 */
const getAISuggestionFromDB = async (payload: { symptoms: string }) => {
	if (!payload?.symptoms) {
		throw new AppError(StatusCode.BAD_REQUEST, 'Symptoms are required!')
	}

	// 🩺 1. Fetch all doctors from DB with specialties
	const doctors = await prisma.doctor.findMany({
		where: { isDeleted: false },
		include: {
			doctorSpecialties: {
				include: { specialties: true },
			},
		},
	})

	// 🧠 2. Prepare the AI prompt
	const prompt = `
You are an AI medical assistant. Based on the given symptoms, suggest the top 3 most suitable doctors from the provided list.

Each doctor includes specialties and experience. Choose only those that are relevant to the symptoms.

### Symptoms:
${payload.symptoms}

### Doctor list (JSON):
${JSON.stringify(doctors, null, 2)}

Return your answer **strictly in JSON format**:
{
  "recommendedDoctors": [/* array of top 3 doctor objects from the list */],
  "reasoning": "short explanation of why these doctors were selected"
}
`

	// 🤖 3. Call OpenRouter Free Model
	let aiSuggestionText = ''
	try {
		const completion = await openAIConfig.chat.completions.create({
			model: 'tngtech/deepseek-r1t2-chimera:free',
			messages: [
				{
					role: 'system',
					content:
						'You are a helpful AI medical assistant that returns structured JSON responses only.',
				},
				{
					role: 'user',
					content: prompt,
				},
			],
		})

		aiSuggestionText = completion?.choices?.[0]?.message?.content?.trim() || ''
	} catch (error: any) {
		console.error('AI Suggestion Error:', error)
		throw new AppError(
			StatusCode.INTERNAL_SERVER_ERROR,
			'Failed to get AI doctor suggestion!',
		)
	}

	// 🧩 4. Safely parse AI JSON output
	let aiSuggestion
	try {
		const jsonMatch = aiSuggestionText.match(/\{[\s\S]*\}/)
		aiSuggestion = jsonMatch ? JSON.parse(jsonMatch[0]) : null
	} catch (error) {
		console.warn('Invalid JSON from AI, returning raw text.')
		aiSuggestion = { recommendedDoctors: [], reasoning: aiSuggestionText }
	}

	// 🏁 5. Return final response
	return {
		totalDoctors: doctors.length,
		recommendedDoctors: aiSuggestion?.recommendedDoctors || [],
		reasoning: aiSuggestion?.reasoning || 'No reasoning provided.',
	}
}

export const DoctorService = {
	getAllDoctorFromDB,
	updateProfileInfoIntoDB,
	getSingleDoctorByIDFromDB,
	deleteDoctorByIDFromDB,
	getAISuggestionFromDB,
}
