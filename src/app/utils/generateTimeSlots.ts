import { addMinutes, isBefore, parse } from 'date-fns'

export interface IGenerateSlotsParams {
	startDate: string // 2026-10-10
	endDate: string // 2026-10-15
	startTime: string // 10:00
	endTime: string // 17:00
	intervalMinutes?: number
}
export interface ISlots {
	startDateTime: Date
	endDateTime: Date
}

export const generateTimeSlots = ({
	startDate,
	endDate,
	startTime,
	endTime,
	intervalMinutes = 30,
}: IGenerateSlotsParams) => {
	const slots: ISlots[] = []

	let currentDate = new Date(startDate)
	let lastDate = new Date(endDate)

	while (currentDate <= lastDate) {
		const day = currentDate.toISOString().split('T')[0]

		let slotStart = parse(`${day} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date())
		let slotEnd = parse(`${day} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date())

		while (isBefore(slotStart, slotEnd)) {
			const slotEndTime = addMinutes(slotStart, intervalMinutes)
			if (
				isBefore(slotEndTime, slotEnd) ||
				slotEndTime.getTime() === slotEnd.getTime()
			) {
				slots.push({
					startDateTime: slotStart,
					endDateTime: slotEndTime,
				})
			}
			slotStart = slotEndTime
		}
		currentDate.setDate(currentDate.getDate() + 1)
	}
	return slots
}
