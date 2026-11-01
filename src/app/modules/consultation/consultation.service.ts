import { prisma } from '@/config/prisma.config';
import AppError from '@/helpers/AppError';
import StatusCode from '@/utils/statusCode';
import type { JwtPayload } from 'jsonwebtoken';
import { UserRole, CallStatus, AppointmentStatus } from '@prisma/client';

const verifyConsultationAccess = async (appointmentId: string, user: JwtPayload) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        include: {
          patientHealthData: true,
          medicalReport: true,
        },
      },
      doctor: true,
      schedule: true,
    },
  });

  if (!appointment) {
    throw new AppError(StatusCode.NOT_FOUND, 'Appointment not found');
  }

  if (appointment.status === AppointmentStatus.CANCELED) {
    throw new AppError(StatusCode.BAD_REQUEST, 'This appointment has been canceled');
  }

  if (user.role === UserRole.PATIENT && appointment.patient.email !== user.email) {
    throw new AppError(
      StatusCode.FORBIDDEN,
      'You are not authorized to join this consultation room'
    );
  }

  if (user.role === UserRole.DOCTOR && appointment.doctor.email !== user.email) {
    throw new AppError(
      StatusCode.FORBIDDEN,
      'You are not authorized to join this consultation room'
    );
  }

  return appointment;
};

const getOrCreateSession = async (appointmentId: string, user: JwtPayload) => {
  const appointment = await verifyConsultationAccess(appointmentId, user);

  let session = await prisma.consultationSession.findUnique({
    where: { appointmentId },
  });

  const now = new Date();

  if (!session) {
    session = await prisma.consultationSession.create({
      data: {
        appointmentId,
        roomName: `wellspace-${appointmentId}`,
        doctorJoinedAt: user.role === UserRole.DOCTOR ? now : null,
        patientJoinedAt: user.role === UserRole.PATIENT ? now : null,
        startedAt: now,
        status: CallStatus.CONNECTED,
      },
    });

    if (appointment.status === AppointmentStatus.SCHEDULED) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.INPROGRESS },
      });
    }
  } else {
    // Update join timestamp
    session = await prisma.consultationSession.update({
      where: { appointmentId },
      data: {
        doctorJoinedAt: user.role === UserRole.DOCTOR ? now : session.doctorJoinedAt,
        patientJoinedAt: user.role === UserRole.PATIENT ? now : session.patientJoinedAt,
        status: session.status === CallStatus.ENDED ? CallStatus.ENDED : CallStatus.CONNECTED,
      },
    });
  }

  return {
    session,
    appointment: {
      id: appointment.id,
      status: appointment.status,
      videoCallingId: appointment.videoCallingId,
      doctor: {
        id: appointment.doctor.id,
        name: appointment.doctor.name,
        qualification: appointment.doctor.qualification,
        designation: appointment.doctor.designation,
        profilePhoto: appointment.doctor.profilePhoto,
      },
      patient: {
        id: appointment.patient.id,
        name: appointment.patient.name,
        contactNumber: appointment.patient.contactNumber,
        profilePhoto: appointment.patient.profilePhoto,
        healthData: appointment.patient.patientHealthData,
        reports: appointment.patient.medicalReport,
      },
      schedule: appointment.schedule,
    },
  };
};

const endSession = async (appointmentId: string, user: JwtPayload, notes?: string) => {
  // const appointment = await verifyConsultationAccess(appointmentId, user);

  const session = await prisma.consultationSession.findUnique({
    where: { appointmentId },
  });

  const now = new Date();
  let duration = 0;

  if (session?.startedAt) {
    duration = Math.max(0, Math.round((now.getTime() - session.startedAt.getTime()) / 1000));
  }

  const updatedSession = await prisma.consultationSession.upsert({
    where: { appointmentId },
    create: {
      appointmentId,
      roomName: `wellspace-${appointmentId}`,
      startedAt: now,
      endedAt: now,
      durationSeconds: duration,
      status: CallStatus.ENDED,
      notes: notes || null,
    },
    update: {
      endedAt: now,
      durationSeconds: duration,
      status: CallStatus.ENDED,
      notes: notes !== undefined ? notes : undefined,
    },
  });

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.COMPLETED },
  });

  return updatedSession;
};

const saveNotes = async (appointmentId: string, user: JwtPayload, notes: string) => {
  if (user.role !== UserRole.DOCTOR && user.role !== UserRole.ADMIN) {
    throw new AppError(
      StatusCode.FORBIDDEN,
      'Only attending doctors can record consultation notes'
    );
  }

  return prisma.consultationSession.update({
    where: { appointmentId },
    data: { notes },
  });
};

export const ConsultationService = {
  getOrCreateSession,
  endSession,
  saveNotes,
};
