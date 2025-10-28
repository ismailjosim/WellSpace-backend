import { prisma } from '@/config/prisma.config'
import type { JwtPayload } from 'jsonwebtoken'
import AppError from '../../helpers/AppError'
import StatusCode from '../../utils/statusCode'

const createReviewIntoDB = async (
	user: JwtPayload,
	payload: { appointmentId: string; rating: number; instructions: string },
) => {
	console.log('Creating review with payload:', payload)
	const appointmentData = await prisma.appointment.findUniqueOrThrow({
		where: {
			id: payload.appointmentId,
		},
	})

	if (user.userId !== appointmentData.patientId) {
		throw new AppError(StatusCode.BAD_REQUEST, 'This is not your appointment')
	}
	return null
}

export const ReviewService = {
	createReviewIntoDB,
}

//  "appointmentId": "d707cd60-8f8d-47a7-b3cd-730b105261ea",
//     "rating": 4.5,
//     "instructions": "good service. the doctor is very friendly"
