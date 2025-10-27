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

	const whereConditions = buildWhereCondition<Prisma.DoctorWhereInput>(
		doctorSearchableFields as (keyof Prisma.DoctorWhereInput)[],
		filters,
	)

	const finalWhere: Prisma.DoctorWhereInput = {
		AND: [whereConditions, { isDeleted: false }],
	}

	const result = await prisma.doctor.findMany({
		where: finalWhere,
		skip,
		take: limit,
		orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: 'desc' },
		include: {
			doctorSpecialties: { include: { specialties: true } },
		},
	})

	// Flatten doctorSpecialties
	const formattedData = result.map((doctor) => ({
		...doctor,
		doctorSpecialties: doctor.doctorSpecialties.map((ds) => ({
			id: ds.specialties.id,
			title: ds.specialties.title,
			icon: ds.specialties.icon,
		})),
	}))

	const total = await prisma.doctor.count({ where: finalWhere })

	return {
		meta: { page, limit, total },
		data: formattedData,
	}
}

/*
 * Update doctor profile info (atomic with transaction)
 */
const updateProfileInfoIntoDB = async (
	id: string,
	payload: Partial<IDoctorUpdateInput>,
) => {
	return await prisma.$transaction(async (tx) => {
		const existingDoctor = await tx.doctor.findUnique({
			where: { id },
		})
		if (!existingDoctor) {
			throw new AppError(StatusCode.NOT_FOUND, 'Doctor not found')
		}

		const { specialties, ...doctorData } = payload

		// --- Handle specialties updates
		if (specialties && specialties.length > 0) {
			// Delete removed specialties
			await Promise.all(
				specialties
					.filter((s) => s.isDeleted)
					.map((s) =>
						tx.doctorSpecialties.deleteMany({
							where: { doctorId: id, specialtiesId: s.specialtyId },
						}),
					),
			)

			// Add new specialties
			await Promise.all(
				specialties
					.filter((s) => !s.isDeleted)
					.map((s) =>
						tx.doctorSpecialties.create({
							data: { doctorId: id, specialtiesId: s.specialtyId },
						}),
					),
			)
		}

		// --- Update basic doctor info
		const updatedDoctor = await tx.doctor.update({
			where: { id },
			data: doctorData,
			include: { doctorSpecialties: { include: { specialties: true } } },
		})

		// Flatten specialties before returning
		return {
			...updatedDoctor,
			doctorSpecialties: updatedDoctor.doctorSpecialties.map((ds) => ({
				id: ds.specialties.id,
				title: ds.specialties.title,
				icon: ds.specialties.icon,
			})),
		}
	})
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
