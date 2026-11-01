import cron from 'node-cron';
import { prisma } from '@/config/prisma.config';
import {
  AppointmentStatus,
  PaymentStatus,
  ReminderType,
  ReminderChannel,
  NotificationType,
} from '@prisma/client';
import { logAuditEvent } from '@/shared/auditService';

export const runUnpaidAppointmentsCleanupJob = async (): Promise<number> => {
  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    const unpaidAppointments = await prisma.appointment.findMany({
      where: {
        paymentStatus: PaymentStatus.UNPAID,
        status: AppointmentStatus.SCHEDULED,
        createdAt: {
          lte: thirtyMinsAgo,
        },
      },
      include: {
        patient: {
          include: { user: true },
        },
      },
    });

    if (unpaidAppointments.length === 0) {
      return 0;
    }

    for (const appt of unpaidAppointments) {
      await prisma.$transaction([
        prisma.appointment.update({
          where: { id: appt.id },
          data: { status: AppointmentStatus.CANCELED },
        }),
        prisma.doctorSchedule.updateMany({
          where: {
            doctorId: appt.doctorId,
            scheduleId: appt.scheduleId,
          },
          data: { isBooked: false },
        }),
      ]);

      if (appt.patient?.user?.id) {
        await prisma.notification.create({
          data: {
            recipientId: appt.patient.user.id,
            type: NotificationType.APPOINTMENT_STATUS_UPDATED,
            title: 'Appointment Auto-Cancelled (Unpaid)',
            message:
              'Your appointment reservation was automatically cancelled because payment was not completed within 30 minutes. You may book another available slot anytime.',
          },
        });
      }

      await logAuditEvent({
        action: 'APPOINTMENT_AUTO_CANCELED_UNPAID',
        resourceType: 'Appointment',
        resourceId: appt.id,
        newData: { status: AppointmentStatus.CANCELED, reason: 'Payment timeout 30m' },
      });
    }

    return unpaidAppointments.length;
  } catch (error) {
    console.error('[Scheduler Error] Failed in unpaid appointments cleanup job:', error);
    return 0;
  }
};

export const run24HourReminderJob = async (): Promise<number> => {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.SCHEDULED,
        schedule: {
          startDateTime: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
        reminderLogs: {
          none: {
            reminderType: ReminderType.TWENTY_FOUR_HOUR,
          },
        },
      },
      include: {
        patient: { include: { user: true } },
        doctor: true,
        schedule: true,
      },
    });

    for (const appt of appointments) {
      if (appt.patient?.user?.id) {
        await prisma.notification.create({
          data: {
            recipientId: appt.patient.user.id,
            type: NotificationType.APPOINTMENT_BOOKED,
            title: 'Upcoming Consultation Tomorrow (24h Reminder)',
            message: `Reminder: You have a scheduled appointment with Dr. ${appt.doctor.name} tomorrow at ${new Date(appt.schedule.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          },
        });
      }

      await prisma.reminderLog.create({
        data: {
          appointmentId: appt.id,
          reminderType: ReminderType.TWENTY_FOUR_HOUR,
          channel: ReminderChannel.IN_APP,
        },
      });
    }

    return appointments.length;
  } catch (error) {
    console.error('[Scheduler Error] Failed in 24h reminder job:', error);
    return 0;
  }
};

export const run1HourReminderJob = async (): Promise<number> => {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 45 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 75 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.SCHEDULED,
        schedule: {
          startDateTime: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
        reminderLogs: {
          none: {
            reminderType: ReminderType.ONE_HOUR,
          },
        },
      },
      include: {
        patient: { include: { user: true } },
        doctor: true,
        schedule: true,
      },
    });

    for (const appt of appointments) {
      if (appt.patient?.user?.id) {
        await prisma.notification.create({
          data: {
            recipientId: appt.patient.user.id,
            type: NotificationType.APPOINTMENT_BOOKED,
            title: 'Consultation Starting in 1 Hour!',
            message: `Your video consultation with Dr. ${appt.doctor.name} starts in 1 hour. Please be ready to join your room.`,
          },
        });
      }

      await prisma.reminderLog.create({
        data: {
          appointmentId: appt.id,
          reminderType: ReminderType.ONE_HOUR,
          channel: ReminderChannel.IN_APP,
        },
      });
    }

    return appointments.length;
  } catch (error) {
    console.error('[Scheduler Error] Failed in 1h reminder job:', error);
    return 0;
  }
};

export const initScheduler = () => {
  console.log('⏰ Initializing Background Cron Scheduler Engine...');

  // 1. Every 10 minutes: release unpaid appointment reservations
  cron.schedule('*/10 * * * *', async () => {
    const cleaned = await runUnpaidAppointmentsCleanupJob();
    if (cleaned > 0) {
      console.log(`[Scheduler] Released ${cleaned} unpaid appointments.`);
    }
  });

  // 2. Hourly: 24h appointment reminders
  cron.schedule('0 * * * *', async () => {
    const reminded = await run24HourReminderJob();
    if (reminded > 0) {
      console.log(`[Scheduler] Sent ${reminded} 24-hour appointment reminders.`);
    }
  });

  // 3. Every 15 minutes: 1h urgent appointment reminders
  cron.schedule('*/15 * * * *', async () => {
    const reminded = await run1HourReminderJob();
    if (reminded > 0) {
      console.log(`[Scheduler] Sent ${reminded} 1-hour appointment reminders.`);
    }
  });

  console.log('✅ Background Cron Scheduler Engine is running.');
};
