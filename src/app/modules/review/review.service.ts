import { prisma } from '@/config/prisma.config';
import type { JwtPayload } from 'jsonwebtoken';
import AppError from '@/helpers/AppError';
import StatusCode from '@/utils/statusCode';
import { paginationHelper, type IOptions } from '@/utils/paginationHelper';

const getReviewsByDoctorFromDB = async (doctorId: string, options: IOptions) => {
  const { page, limit, skip } = paginationHelper.calcPagination(options);
  const where = { doctorId };

  const [data, total, ratingSummary] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            name: true,
            profilePhoto: true,
          },
        },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({
      where,
      _avg: { rating: true },
    }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      averageRating: ratingSummary._avg.rating ?? 0,
    },
  };
};

const createReviewIntoDB = async (
  user: JwtPayload,
  payload: { appointmentId: string; rating: number; comment: string }
) => {
  const patientData = await prisma.patient.findUniqueOrThrow({
    where: {
      email: user.email,
    },
  });

  const appointmentData = await prisma.appointment.findUniqueOrThrow({
    where: {
      id: payload.appointmentId,
    },
  });

  if (patientData.id !== appointmentData.patientId) {
    throw new AppError(StatusCode.BAD_REQUEST, 'This is not your appointment');
  }

  return await prisma.$transaction(async (tnx) => {
    const result = await tnx.review.create({
      data: {
        appointmentId: appointmentData.id,
        doctorId: appointmentData.doctorId,
        patientId: appointmentData.patientId,
        rating: payload.rating,
        comment: payload.comment,
      },
    });

    const avgRating = await tnx.review.aggregate({
      where: {
        doctorId: appointmentData.doctorId,
      },
      _avg: {
        rating: true,
      },
    });

    await tnx.doctor.update({
      where: {
        id: appointmentData.doctorId,
      },
      data: {
        averageRating: avgRating._avg.rating as number,
      },
    });
    return result;
  });
};

export const ReviewService = {
  getReviewsByDoctorFromDB,
  createReviewIntoDB,
};
