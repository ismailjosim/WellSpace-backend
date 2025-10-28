import { paginationHelper, type IOptions } from '@/utils/paginationHelper'
import type { Prisma } from '@prisma/client'
import { buildWhereCondition } from '@/utils/prismaFilter'
import { prisma } from '@/config/prisma.config'
import { patientSearchableFields } from './patient.constants'
import StatusCode from '@/utils/statusCode'
import AppError from '@/helpers/AppError'

/*
 * Get all patients (paginated & filterable)
 */
const getAllPatientsFromDB = async (filters: any, options: IOptions) => {
	const { page, limit, skip, sortBy, orderBy } =
		paginationHelper.calcPagination(options)

	const whereConditions = buildWhereCondition<Prisma.PatientWhereInput>(
		patientSearchableFields as (keyof Prisma.PatientWhereInput)[],
		filters,
	)

	const finalWhere: Prisma.PatientWhereInput = {
		AND: [whereConditions, { isDeleted: false }],
	}

	const result = await prisma.patient.findMany({
		where: finalWhere,
		skip,
		take: limit,
		orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: 'desc' },
	})

	const total = await prisma.patient.count({
		where: finalWhere,
	})

	return {
		meta: { page, limit, total },
		data: result,
	}
}

/*
 * Get single patient by ID
 */
const getPatientByIDFromDB = async (id: string) => {
	const result = await prisma.patient.findUnique({
		where: { id },
	})

	if (!result || result.isDeleted) {
		throw new AppError(StatusCode.NOT_FOUND, 'Patient not found')
	}

	return result
}

/*
 * Update patient info by ID
 */
const updatePatientInfoByIDIntoDB = async (
	id: string,
	payload: Prisma.PatientUpdateInput,
) => {
	const updatedPatient = await prisma.patient.update({
		where: { id },
		data: payload,
	})

	if (!updatedPatient) {
		throw new AppError(StatusCode.NOT_FOUND, 'Patient not found')
	}

	return updatedPatient
}

/*
 * Soft delete patient by ID
 */
const deletePatientByIDFromDB = async (id: string) => {
	const existingPatient = await prisma.patient.findUnique({
		where: { id },
	})

	if (!existingPatient || existingPatient.isDeleted) {
		throw new AppError(StatusCode.NOT_FOUND, 'Patient not found')
	}

	const updatedPatient = await prisma.patient.update({
		where: { id },
		data: {
			isDeleted: true,
		},
	})

	return updatedPatient
}

export const PatientService = {
	getAllPatientsFromDB,
	getPatientByIDFromDB,
	updatePatientInfoByIDIntoDB,
	deletePatientByIDFromDB,
}
