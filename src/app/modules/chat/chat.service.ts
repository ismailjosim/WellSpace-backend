import { prisma } from '@/config/prisma.config';
import AppError from '@/helpers/AppError';
import StatusCode from '@/utils/statusCode';
import type { JwtPayload } from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { NotificationStream } from '../notification/notification.stream';

const verifyAppointmentAccess = async (appointmentId: string, user: JwtPayload) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      doctor: true,
    },
  });

  if (!appointment) {
    throw new AppError(StatusCode.NOT_FOUND, 'Appointment not found');
  }

  if (user.role === UserRole.PATIENT && appointment.patient.email !== user.email) {
    throw new AppError(
      StatusCode.FORBIDDEN,
      'You are not authorized to access this consultation chat'
    );
  }

  if (user.role === UserRole.DOCTOR && appointment.doctor.email !== user.email) {
    throw new AppError(
      StatusCode.FORBIDDEN,
      'You are not authorized to access this consultation chat'
    );
  }

  return appointment;
};

const getOrCreateChatRoom = async (appointmentId: string, user: JwtPayload) => {
  const appointment = await verifyAppointmentAccess(appointmentId, user);

  let chatRoom = await prisma.chatRoom.findUnique({
    where: { appointmentId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 100,
      },
    },
  });

  if (!chatRoom) {
    chatRoom = await prisma.chatRoom.create({
      data: { appointmentId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  return {
    chatRoom,
    appointment: {
      id: appointment.id,
      status: appointment.status,
      doctor: {
        id: appointment.doctor.id,
        name: appointment.doctor.name,
        profilePhoto: appointment.doctor.profilePhoto,
      },
      patient: {
        id: appointment.patient.id,
        name: appointment.patient.name,
        profilePhoto: appointment.patient.profilePhoto,
      },
    },
  };
};

const sendMessage = async (
  appointmentId: string,
  user: JwtPayload,
  payload: { content: string; attachment?: string; fileType?: string }
) => {
  const appointment = await verifyAppointmentAccess(appointmentId, user);

  let chatRoom = await prisma.chatRoom.findUnique({
    where: { appointmentId },
  });

  if (!chatRoom) {
    chatRoom = await prisma.chatRoom.create({
      data: { appointmentId },
    });
  }

  const senderName =
    user.role === UserRole.DOCTOR ? `Dr. ${appointment.doctor.name}` : appointment.patient.name;

  const message = await prisma.message.create({
    data: {
      chatRoomId: chatRoom.id,
      senderId: user.userId,
      senderRole: user.role,
      senderName,
      content: payload.content,
      attachment: payload.attachment || null,
      fileType: payload.fileType || null,
    },
  });

  // Notify recipient via NotificationStream
  const recipientEmail =
    user.role === UserRole.DOCTOR ? appointment.patient.email : appointment.doctor.email;

  const recipientUser = await prisma.user.findUnique({
    where: { email: recipientEmail },
    select: { id: true },
  });

  if (recipientUser) {
    NotificationStream.sendToUser(recipientUser.id, 'new_message', {
      appointmentId,
      message,
    });
  }

  return message;
};

const markMessagesAsRead = async (appointmentId: string, user: JwtPayload) => {
  await verifyAppointmentAccess(appointmentId, user);

  const chatRoom = await prisma.chatRoom.findUnique({
    where: { appointmentId },
  });

  if (!chatRoom) return { count: 0 };

  const updated = await prisma.message.updateMany({
    where: {
      chatRoomId: chatRoom.id,
      senderId: { not: user.userId },
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return updated;
};

export const ChatService = {
  getOrCreateChatRoom,
  sendMessage,
  markMessagesAsRead,
};
