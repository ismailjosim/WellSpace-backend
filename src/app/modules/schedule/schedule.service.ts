import { prisma } from '@/config/prisma.config'
import { generateTimeSlots } from '@/utils/generateTimeSlots'
import { paginationHelper, type IOptions } from '@/utils/paginationHelper'
import { buildWhereCondition } from '../../utils/prismaFilter'
import type { Prisma } from '@prisma/client'

const createScheduleIntoDb = async (payload: any) => {
	const slots = generateTimeSlots(payload)
	const newSchedules = []

	for (const slot of slots) {
		const isSlotExist = await prisma.schedule.findFirst({
			where: {
				startDateTime: slot.startDateTime,
				endDateTime: slot.endDateTime,
			},
		})
		if (!isSlotExist) {
			const created = await prisma.schedule.create({ data: slot })
			newSchedules.push(created)
		}
	}

	return newSchedules
}
const getScheduleForDoctorFromDB = async (filters: any, options: IOptions) => {
	const { page, limit, skip, sortBy, orderBy } =
		paginationHelper.calcPagination(options)
	// const { startDateTime, endDateTime } = filters
	const whereConditions = buildWhereCondition<Prisma.UserWhereInput>(
		undefined,
		filters,
	)

	const result = await prisma.schedule.findMany({
		skip,
		take: limit,

		where: whereConditions,
		orderBy: {
			[sortBy]: orderBy,
		},
	})

	const total = await prisma.schedule.count({
		where: whereConditions,
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

const deleteScheduleFromDB = async (id: string) => {
	return await prisma.schedule.delete({
		where: {
			id,
		},
	})
}

const deleteDateRangeScheduleFromDB = async (
	startDateTime: string,
	endDateTime: string,
) => {
	const whereConditions = {
		AND: [
			{
				startDateTime: {
					gte: new Date(startDateTime),
				},
			},
			{
				endDateTime: {
					lte: new Date(endDateTime),
				},
			},
		],
	}

	// Check if schedules exist in the range
	const existingSchedules = await prisma.schedule.findMany({
		where: whereConditions,
		select: {
			id: true,
			startDateTime: true,
			endDateTime: true,
		},
	})

	// Return early if no schedules found
	if (existingSchedules.length === 0) {
		return {
			count: 0,
			message: 'No schedules found in the specified date range',
			deletedSchedules: [],
		}
	}

	// Delete schedules using deleteMany (not delete)
	const deletedSchedules = await prisma.schedule.deleteMany({
		where: whereConditions,
	})

	return {
		count: deletedSchedules.count,
		deletedSchedules: existingSchedules,
		dateRange: {
			start: startDateTime,
			end: endDateTime,
		},
	}
}

export const scheduleService = {
	createScheduleIntoDb,
	getScheduleForDoctorFromDB,
	deleteScheduleFromDB,
	deleteDateRangeScheduleFromDB,
}
/*
===========================================================
	console.log({ startTime, endTime, startDate, endDate })

	const intervalTime = 30
	const schedules = []

	const currentDate = new Date(startDate)
	const lastDate = new Date(endDate)

	// divided into slot
	while (currentDate <= lastDate) {
		const startDateTime = new Date(
			addMinutes(
				addHours(
					`${format(currentDate, 'yyyy-MM-dd')}`,
					Number(startTime.split(':')[0]),
				),
				Number(startTime.split(':')[1]),
			),
		)
		const endDateTime = new Date(
			addMinutes(
				addHours(
					`${format(currentDate, 'yyyy-MM-dd')}`,
					Number(endTime.split(':')[0]),
				),
				Number(endTime.split(':')[1]),
			),
		)
		console.log({ startDateTime, endDateTime })

		while (startDateTime < endDateTime) {
			const slotStartDateTime = startDateTime // 10:00
			const slotEndDateTime = addMinutes(slotStartDateTime, intervalTime) // 10:30

			const scheduleData = {
				startDateTime: slotStartDateTime,
				endDateTime: slotEndDateTime,
			}
			console.log({ scheduleData })
			const isScheduleExist = await prisma.schedule.findFirst({
				where: scheduleData,
			})
			if (!isScheduleExist) {
				const result = await prisma.schedule.create({
					data: scheduleData,
				})
				schedules.push(result)
			}
			slotStartDateTime.setMinutes(
				slotStartDateTime.getMinutes() + intervalTime,
			)
		}
		currentDate.setDate(currentDate.getDate() + 1)
	}
===========================================================
 */
