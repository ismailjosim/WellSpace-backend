import type { JwtPayload } from 'jsonwebtoken'
import { prisma } from '@/config/prisma.config'
import { paginationHelper, type IOptions } from '../../utils/paginationHelper'
import { buildWhereCondition } from '../../utils/prismaFilter'
import type { Prisma } from '@prisma/client'
import type { IPaginationOptions } from '../../interfaces/pagination'
import AppError from '../../helpers/AppError'
import StatusCode from '../../utils/statusCode'

const createDoctorScheduleIntoDB = async (
	user: JwtPayload,
	payload: { scheduleIds: string[] },
) => {
	const doctor = await prisma.doctor.findFirstOrThrow({
		where: {
			email: user.email,
		},
	})
	const doctorScheduleData = payload.scheduleIds.map((scheduleId) => ({
		doctorId: doctor.id,
		scheduleId,
	}))
	const result = await prisma.doctorSchedule.createMany({
		data: doctorScheduleData,
	})
	return result
}
const getAllDoctorSchedulesFromDB = async (options: IOptions, filters: any) => {
	const { page, limit, skip, sortBy, orderBy } =
		paginationHelper.calcPagination(options)

	const whereConditions = buildWhereCondition<Prisma.PatientWhereInput>(
		[],
		filters,
	)
	const result = await prisma.doctorSchedule.findMany({
		include: {
			doctor: true,
			schedule: true,
		},
		where: whereConditions,
		skip,
		take: limit,
		orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: 'desc' },
	})

	const total = await prisma.doctorSchedule.count({
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
const getMyScheduleFromDB = async (
	filters: any,
	options: IPaginationOptions,
	user: JwtPayload,
) => {
	const { page, limit, skip, sortBy, orderBy } =
		paginationHelper.calcPagination(options)

	// 🔹 Use your utility function
	const whereConditions = buildWhereCondition<any>(
		[], // no searchable fields for now
		filters,
	)

	// 🔹 Always scope to logged-in user (doctor)
	const finalWhere: Prisma.DoctorScheduleWhereInput = {
		AND: [
			whereConditions,
			{
				doctorId: user.userId,
			},
		],
	}

	const result = await prisma.doctorSchedule.findMany({
		// where: finalWhere,
		skip,
		take: limit,
		orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: 'desc' },
	})
	// console.log({ result })

	const total = await prisma.doctorSchedule.count({
		where: finalWhere,
	})

	return {
		meta: {
			page,
			limit,
			total,
		},
		data: result,
	}
}

const deleteDoctorScheduleByIdFromDB = async (
	user: JwtPayload,
	scheduleId: string,
) => {
	const doctor = await prisma.doctor.findFirstOrThrow({
		where: {
			email: user.email,
		},
	})
	const isBookedSchedule = await prisma.doctorSchedule.findFirst({
		where: {
			doctorId: doctor.id,
			scheduleId,
			isBooked: true,
		},
	})
	if (isBookedSchedule) {
		throw new AppError(
			StatusCode.BAD_REQUEST,
			'You can not delete the schedule because of the schedule is already booked!',
		)
	}
	const result = await prisma.doctorSchedule.delete({
		where: {
			doctorId_scheduleId: {
				doctorId: doctor.id,
				scheduleId,
			},
		},
	})

	return result
}

export const DoctorScheduleService = {
	createDoctorScheduleIntoDB,
	getAllDoctorSchedulesFromDB,
	getMyScheduleFromDB,
	deleteDoctorScheduleByIdFromDB,
}
/*
{
  scheduleIds: [
    'c95bab60-ef00-45b5-a4ef-b7fe561cd4f4',
    'c222f134-9f1f-4983-84ab-afd81d96e2e5',
    '5d5f595c-3b8a-4f5d-a70a-0104740ee2d1'
  ]
} {
  userId: 'ca9d0a16-095b-45d9-8e46-a5d77bb38562',
  email: 'yeasin.ahmed@ex.com',
  role: 'DOCTOR',
  iat: 1760525234,
  exp: 1760611634
}
*/
