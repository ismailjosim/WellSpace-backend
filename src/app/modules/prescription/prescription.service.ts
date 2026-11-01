import { prisma } from '@/config/prisma.config';
import {
  AppointmentStatus,
  FollowUpStatus,
  PaymentStatus,
  Prisma,
  UserRole,
  type Prescription,
} from '@prisma/client';
import type { JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import AppError from '../../helpers/AppError';
import StatusCode from '../../utils/statusCode';
import { paginationHelper, type IOptions } from '../../utils/paginationHelper';
import { buildWhereCondition } from '../../utils/prismaFilter';
import { prescriptionsFilterableFields } from './prescription.const';
import { NotificationService } from '../notification/notification.service';
import { logAuditEvent } from '@/shared/auditService';

const createPrescriptionIntoDB = async (user: JwtPayload, payload: Partial<Prescription>) => {
  const appointmentData = await prisma.appointment.findUniqueOrThrow({
    where: {
      id: payload.appointmentId,
      status: AppointmentStatus.COMPLETED,
      // paymentStatus: PaymentStatus.PAID, // TODO: uncomment this when payment flow is implemented
    },
    include: {
      doctor: true,
    },
  });

  if (user.role === UserRole.DOCTOR) {
    // only allow if doctor owns the appointment
    if (user.email !== appointmentData.doctor.email) {
      throw new AppError(StatusCode.FORBIDDEN, 'This is not your appointment');
    }
  }
  // Implement DB logic here
  const result = await prisma.prescription.create({
    data: {
      appointmentId: appointmentData.id,
      doctorId: appointmentData.doctorId,
      patientId: appointmentData.patientId,
      instructions: payload.instructions as string,
      followUpDate: payload.followUpDate || null,
    },
    include: {
      patient: true,
    },
  });

  await NotificationService.createPrescriptionCreatedNotifications(result.id);

  return result;
};

const getMyPrescriptionsFromDB = async (
  user: JwtPayload,
  filters: Record<string, any>,
  options: IOptions
) => {
  const { page, limit, skip, sortBy, orderBy } = paginationHelper.calcPagination(options);

  // Build filter conditions based on filterable fields
  const whereConditions = buildWhereCondition<Prisma.PrescriptionWhereInput>(
    prescriptionsFilterableFields as (keyof Prisma.PrescriptionWhereInput)[],
    filters
  );

  // Role-based base filter
  let roleFilter: Prisma.PrescriptionWhereInput = {};

  if (user.role === UserRole.PATIENT) {
    roleFilter = { patientId: user.id };
  } else if (user.role === UserRole.DOCTOR) {
    roleFilter = { doctorId: user.id };
  } else {
    throw new AppError(StatusCode.FORBIDDEN, 'You are not authorized to access this prescription');
  }

  const finalWhere: Prisma.PrescriptionWhereInput = {
    AND: [whereConditions, roleFilter],
  };

  const result = await prisma.prescription.findMany({
    where: finalWhere,
    skip,
    take: limit,
    orderBy: sortBy && orderBy ? { [sortBy]: orderBy } : { createdAt: 'desc' },
    include: {
      doctor: true,
      patient: true,
      appointment: true,
    },
  });

  const total = await prisma.prescription.count({
    where: finalWhere,
  });

  return {
    meta: { page, limit, total },
    data: result,
  };
};

const getSinglePrescriptionFromDB = async (user: JwtPayload, id: string) => {
  const prescription = await prisma.prescription.findUniqueOrThrow({
    where: { id },
    include: {
      patient: {
        include: {
          patientHealthData: true,
        },
      },
      doctor: {
        include: {
          doctorSpecialties: {
            include: { specialties: true },
          },
        },
      },
      appointment: {
        include: {
          schedule: true,
        },
      },
    },
  });

  if (user.role === UserRole.PATIENT && prescription.patient.email !== user.email) {
    throw new AppError(StatusCode.FORBIDDEN, 'You cannot access this prescription');
  }

  if (user.role === UserRole.DOCTOR && prescription.doctor.email !== user.email) {
    throw new AppError(StatusCode.FORBIDDEN, 'You cannot access this prescription');
  }

  return prescription;
};

const getMyFollowUpsFromDB = async (user: JwtPayload) => {
  const patient = await prisma.patient.findUniqueOrThrow({
    where: { email: user.email },
  });

  const followUps = await prisma.prescription.findMany({
    where: {
      patientId: patient.id,
      followUpDate: { not: null },
    },
    include: {
      doctor: {
        include: {
          doctorSpecialties: {
            include: { specialties: true },
          },
        },
      },
      appointment: {
        include: { schedule: true },
      },
    },
    orderBy: { followUpDate: 'asc' },
  });

  const now = new Date();
  const updatedFollowUps = await Promise.all(
    followUps.map(async (rx) => {
      if (
        rx.followUpStatus === FollowUpStatus.PENDING &&
        rx.followUpDate &&
        new Date(rx.followUpDate) < now
      ) {
        await prisma.prescription.update({
          where: { id: rx.id },
          data: { followUpStatus: FollowUpStatus.OVERDUE },
        });
        return { ...rx, followUpStatus: FollowUpStatus.OVERDUE };
      }
      return rx;
    })
  );

  return updatedFollowUps;
};

const getDoctorDueFollowUpsFromDB = async (user: JwtPayload) => {
  const doctor = await prisma.doctor.findUniqueOrThrow({
    where: { email: user.email },
  });

  const followUps = await prisma.prescription.findMany({
    where: {
      doctorId: doctor.id,
      followUpDate: { not: null },
    },
    include: {
      patient: true,
      appointment: {
        include: { schedule: true },
      },
    },
    orderBy: { followUpDate: 'asc' },
  });

  return followUps;
};

const bookFollowUpAppointmentInDB = async (
  user: JwtPayload,
  prescriptionId: string,
  scheduleId: string
) => {
  const patient = await prisma.patient.findUniqueOrThrow({
    where: { email: user.email },
  });

  const prescription = await prisma.prescription.findUniqueOrThrow({
    where: { id: prescriptionId, patientId: patient.id },
    include: { doctor: true },
  });

  if (prescription.followUpStatus === FollowUpStatus.BOOKED) {
    throw new AppError(
      StatusCode.BAD_REQUEST,
      'A follow-up appointment has already been booked for this prescription'
    );
  }

  await prisma.doctorSchedule.findFirstOrThrow({
    where: {
      doctorId: prescription.doctorId,
      scheduleId: scheduleId,
      isBooked: false,
    },
  });

  const videoCallingId = uuidv4();
  const transactionId = uuidv4();

  const newAppointment = await prisma.$transaction(async (tnx) => {
    const appointment = await tnx.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: prescription.doctorId,
        scheduleId,
        videoCallingId,
        status: AppointmentStatus.SCHEDULED,
        paymentStatus: PaymentStatus.UNPAID,
      },
      include: {
        doctor: true,
        schedule: true,
      },
    });

    await tnx.doctorSchedule.update({
      where: {
        doctorId_scheduleId: {
          doctorId: prescription.doctorId,
          scheduleId,
        },
      },
      data: { isBooked: true },
    });

    await tnx.payment.create({
      data: {
        appointmentId: appointment.id,
        amount: prescription.doctor.appointmentFee,
        transactionId,
        status: PaymentStatus.UNPAID,
      },
    });

    await tnx.prescription.update({
      where: { id: prescriptionId },
      data: {
        followUpStatus: FollowUpStatus.BOOKED,
        followUpAppointmentId: appointment.id,
      },
    });

    return appointment;
  });

  await logAuditEvent({
    userId: user.userId,
    userEmail: user.email,
    userRole: user.role,
    action: 'FOLLOW_UP_APPOINTMENT_BOOKED',
    resourceType: 'Appointment',
    resourceId: newAppointment.id,
    newData: {
      prescriptionId,
      doctorId: prescription.doctorId,
      scheduleId,
    },
  });

  return newAppointment;
};

export const PrescriptionService = {
  createPrescriptionIntoDB,
  getMyPrescriptionsFromDB,
  getSinglePrescriptionFromDB,
  getMyFollowUpsFromDB,
  getDoctorDueFollowUpsFromDB,
  bookFollowUpAppointmentInDB,
};
