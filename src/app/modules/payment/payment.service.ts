import { prisma } from '@/config/prisma.config';
import { PaymentStatus } from '@prisma/client';
import type Stripe from 'stripe';
import { NotificationService } from '../notification/notification.service';
import type { JwtPayload } from 'jsonwebtoken';
import AppError from '@/helpers/AppError';
import StatusCode from '@/utils/statusCode';
import { stripeConfig } from '@/config/stripe.config';

const markSessionAsPaid = async (session: Stripe.Checkout.Session) => {
  const appointmentId = session.metadata?.appointmentId;
  const paymentId = session.metadata?.paymentId;
  if (!appointmentId || !paymentId) {
    console.error('Stripe checkout session is missing appointment/payment metadata', {
      sessionId: session.id,
    });
    return;
  }

  const paymentData = JSON.parse(JSON.stringify(session));
  const appointmentWasUpdated = await prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findFirst({
      where: { id: paymentId, appointmentId },
      select: { id: true },
    });
    if (!payment) {
      console.error('Stripe checkout session does not match an existing payment', {
        sessionId: session.id,
        appointmentId,
        paymentId,
      });
      return false;
    }

    const updatedAppointment = await transaction.appointment.updateMany({
      where: { id: appointmentId, paymentStatus: { not: PaymentStatus.PAID } },
      data: { paymentStatus: PaymentStatus.PAID },
    });

    await transaction.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.PAID,
        paymentGatewayData: paymentData,
      },
    });

    return updatedAppointment.count > 0;
  });

  if (appointmentWasUpdated) {
    await NotificationService.createPaymentCompletedNotifications(appointmentId);
  }
};

const handleStripeEvent = async (event: Stripe.Event): Promise<void> => {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid') {
        await markSessionAsPaid(session);
      }
      break;
    }

    default:
      console.log(`⚠️ Unhandled event type: ${event.type}`);
  }
};

const verifyStripePaymentForPatient = async (sessionId: string, user: JwtPayload) => {
  const session = await stripeConfig.checkout.sessions.retrieve(sessionId);
  const appointmentId = session.metadata?.appointmentId;
  const paymentId = session.metadata?.paymentId;

  if (!appointmentId || !paymentId) {
    throw new AppError(StatusCode.NOT_FOUND, 'Payment session was not found');
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      patient: { email: user.email },
      payment: { id: paymentId },
    },
    select: { id: true, paymentStatus: true },
  });
  if (!appointment) {
    throw new AppError(StatusCode.NOT_FOUND, 'Payment session was not found');
  }

  if (session.payment_status === 'paid') {
    await markSessionAsPaid(session);
  }

  return {
    appointmentId: appointment.id,
    paymentStatus:
      session.payment_status === 'paid'
        ? PaymentStatus.PAID
        : session.status === 'open'
          ? PaymentStatus.UNPAID
          : appointment.paymentStatus,
  };
};

export const PaymentService = {
  handleStripeEvent,
  verifyStripePaymentForPatient,
};
