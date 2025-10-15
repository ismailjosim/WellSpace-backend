import { addHours, addMinutes, format } from 'date-fns'
import { prisma } from '@/config/prisma.config'
import { generateTimeSlots, type ISlots } from '@/utils/generateTimeSlots'

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

export const scheduleService = {
	createScheduleIntoDb,
}
/*
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


 */
