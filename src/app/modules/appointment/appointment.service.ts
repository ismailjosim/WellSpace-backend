import { prisma } from '@/config/prisma.config';
import type { JwtPayload } from 'jsonwebtoken';

const createAppointmentIntoDB = async (user: JwtPayload, payload: any) => {
	// Implement DB logic here
	console.log('Creating appointment with payload:', payload);
	return null;
};

export const AppointmentService = {
	createAppointmentIntoDB,
};
