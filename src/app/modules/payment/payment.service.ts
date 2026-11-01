import { prisma } from '@/config/prisma.config';
import { PaymentStatus } from '@prisma/client';
import type Stripe from 'stripe';
import { NotificationService } from '../notification/notification.service';

const handleStripeEvent = async (event: Stripe.Event): Promise<void> => {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      const appointmentId = session.metadata?.appointmentId;
      const paymentId = session?.metadata?.paymentId;

      await prisma.appointment.update({
        where: {
          id: appointmentId,
        },
        data: {
          paymentStatus:
            session.payment_status === 'paid' ? PaymentStatus.PAID : PaymentStatus.UNPAID,
        },
      });

      await prisma.payment.update({
        where: {
          id: paymentId,
        },
        data: {
          status: session.payment_status === 'paid' ? PaymentStatus.PAID : PaymentStatus.UNPAID,
          paymentGatewayData: JSON.parse(JSON.stringify(session)),
        },
      });

      if (appointmentId && session.payment_status === 'paid') {
        await NotificationService.createPaymentCompletedNotifications(appointmentId);
      }
      break;
    }

    default:
      console.log(`⚠️ Unhandled event type: ${event.type}`);
  }
};

export const PaymentService = {
  handleStripeEvent,
};
