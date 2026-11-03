import { prisma } from '@/config/prisma.config';
import { generateTimeSlots } from '@/utils/generateTimeSlots';
import { paginationHelper, type IOptions } from '@/utils/paginationHelper';
import type { Prisma } from '@prisma/client';
import type { JwtPayload } from 'jsonwebtoken';
import AppError from '@/helpers/AppError';
import StatusCode from '@/utils/statusCode';

const createScheduleIntoDb = async (payload: any) => {
  const now = new Date();
  const slots = generateTimeSlots(payload).filter((slot) => slot.startDateTime > now);

  if (slots.length === 0) {
    throw new AppError(StatusCode.BAD_REQUEST, 'No future schedule slots were generated');
  }

  const existingSchedules = await prisma.schedule.findMany({
    where: {
      OR: slots.map(({ startDateTime, endDateTime }) => ({
        startDateTime,
        endDateTime,
      })),
    },
    select: {
      startDateTime: true,
      endDateTime: true,
    },
  });
  const existingSlotKeys = new Set(
    existingSchedules.map(
      ({ startDateTime, endDateTime }) => `${startDateTime.getTime()}-${endDateTime.getTime()}`
    )
  );
  const newSchedules = slots.filter(
    ({ startDateTime, endDateTime }) =>
      !existingSlotKeys.has(`${startDateTime.getTime()}-${endDateTime.getTime()}`)
  );

  if (newSchedules.length === 0) {
    return [];
  }

  await prisma.schedule.createMany({ data: newSchedules });
  return prisma.schedule.findMany({
    where: {
      OR: newSchedules.map(({ startDateTime, endDateTime }) => ({
        startDateTime,
        endDateTime,
      })),
    },
    orderBy: { startDateTime: 'asc' },
  });
};
const getScheduleForDoctorFromDB = async (user: JwtPayload, filters: any, options: IOptions) => {
  const { page, limit, skip, sortBy, orderBy } = paginationHelper.calcPagination(options);

  // * find only those schedule that are available for specific doctor
  const doctorSchedules = await prisma.doctorSchedule.findMany({
    where: {
      doctor: {
        email: user.email,
      },
    },
    select: {
      scheduleId: true,
    },
  });
  const doctorScheduleIds = doctorSchedules.map((schedule) => schedule.scheduleId);
  const scheduleConditions: Prisma.ScheduleWhereInput[] = [
    { startDateTime: { gt: new Date() } },
    { id: { notIn: doctorScheduleIds } },
  ];
  if (filters.startDateTime) {
    scheduleConditions.push({
      startDateTime: { gte: new Date(filters.startDateTime) },
    });
  }
  if (filters.endDateTime) {
    scheduleConditions.push({
      endDateTime: { lte: new Date(filters.endDateTime) },
    });
  }
  const whereConditions: Prisma.ScheduleWhereInput = { AND: scheduleConditions };

  const result = await prisma.schedule.findMany({
    skip,
    take: limit,
    where: whereConditions,
    orderBy:
      sortBy === 'startDateTime'
        ? orderBy === 'asc'
          ? { startDateTime: 'asc' }
          : { startDateTime: 'desc' }
        : { startDateTime: 'asc' },
  });

  const total = await prisma.schedule.count({
    where: whereConditions,
  });
  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};
const getScheduleByIdFromDB = async (id: string) => {
  return await prisma.schedule.findUnique({
    where: {
      id,
    },
  });
};
const deleteScheduleFromDB = async (id: string) => {
  return await prisma.schedule.delete({
    where: {
      id,
    },
  });
};

const deleteDateRangeScheduleFromDB = async (startDateTime: string, endDateTime: string) => {
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
  };

  // Check if schedules exist in the range
  const existingSchedules = await prisma.schedule.findMany({
    where: whereConditions,
    select: {
      id: true,
      startDateTime: true,
      endDateTime: true,
    },
  });

  // Return early if no schedules found
  if (existingSchedules.length === 0) {
    return {
      count: 0,
      message: 'No schedules found in the specified date range',
      deletedSchedules: [],
    };
  }

  // Delete schedules using deleteMany (not delete)
  const deletedSchedules = await prisma.schedule.deleteMany({
    where: whereConditions,
  });

  return {
    count: deletedSchedules.count,
    deletedSchedules: existingSchedules,
    dateRange: {
      start: startDateTime,
      end: endDateTime,
    },
  };
};

export const scheduleService = {
  createScheduleIntoDb,
  getScheduleForDoctorFromDB,
  getScheduleByIdFromDB,
  deleteScheduleFromDB,
  deleteDateRangeScheduleFromDB,
};
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
