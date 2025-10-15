import type { JwtPayload } from 'jsonwebtoken'
import { prisma } from '@/config/prisma.config'

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

export const DoctorScheduleService = {
	createDoctorScheduleIntoDB,
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
