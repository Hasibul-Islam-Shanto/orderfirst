import nodemailer from 'nodemailer';
import { env } from './env.js';
import { logger, errorContext } from './logger.js';
import { buildVerificationEmailContent } from '../templates/verification-email.template.js';
import {
  buildOrderConfirmationEmailContent,
  type OrderConfirmationInput,
} from '../templates/order-confirmation.template.js';
import {
  buildBookingConfirmationEmailContent,
  type BookingConfirmationInput,
} from '../templates/booking-confirmation.template.js';

export let lastTestNotification:
  | { type: string; to: string; payload: unknown }
  | undefined;

const transporter =
  env.EMAIL_USER && env.EMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: env.EMAIL_USER,
          pass: env.EMAIL_APP_PASSWORD,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      })
    : null;

if (transporter) {
  logger.info({ user: env.EMAIL_USER }, 'Gmail SMTP transporter configured');
} else {
  logger.warn('Email delivery in mock mode: EMAIL_USER or EMAIL_APP_PASSWORD is not set');
}

export async function sendNotificationEmail(input: {
  to: string;
  name: string;
  code: string;
}) {
  if (env.NODE_ENV === 'test') {
    lastTestNotification = { type: 'user.registered', to: input.to, payload: input };
    return;
  }
  if (!transporter || !env.EMAIL_USER) {
    logger.warn(
      `[DEV EMAIL NOTIFICATION] Email delivery is not configured. Verification code for ${input.to} (${input.name}): ${input.code}`,
    );
    return;
  }

  const { html, text } = buildVerificationEmailContent(input);

  try {
    const info = await transporter.sendMail({
      from: `"OrderFirst" <${env.EMAIL_USER}>`,
      to: input.to,
      subject: 'Verify your OrderFirst account',
      text,
      html,
    });
    logger.info({ messageId: info.messageId, to: input.to }, 'Notification email sent');
  } catch (error) {
    logger.warn(
      `[FALLBACK VERIFICATION CODE] Delivery to ${input.to} failed. Use OTP code: ${input.code}`,
    );
    logger.error(
      { error: errorContext(error) },
      'Notification email delivery failed',
    );
    throw error;
  }
}

export async function sendOrderNotificationEmail(input: {
  to: string;
  order: OrderConfirmationInput;
}) {
  if (env.NODE_ENV === 'test') {
    lastTestNotification = { type: 'order.created', to: input.to, payload: input.order };
    return;
  }
  if (!transporter || !env.EMAIL_USER) {
    logger.warn(
      `[DEV EMAIL NOTIFICATION] Email delivery is not configured. Order confirmation for ${input.to}: Order #${input.order.orderId}`,
    );
    return;
  }

  const { html, text } = buildOrderConfirmationEmailContent(input.order);

  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_USER,
      to: input.to,
      subject: `Order Confirmation #${input.order.orderId.slice(0, 8)} - OrderFirst`,
      text,
      html,
    });
    logger.info({ messageId: info.messageId }, 'Order notification email sent');
  } catch (error) {
    logger.error(
      { error: errorContext(error) },
      'Order notification email delivery failed',
    );
    throw error;
  }
}

export async function sendOrderStatusNotificationEmail(input: {
  to: string;
  orderId: string;
  customerName: string;
  status: string;
}) {
  if (env.NODE_ENV === 'test') {
    lastTestNotification = { type: 'order.status_updated', to: input.to, payload: input };
    return;
  }
  if (!transporter || !env.EMAIL_USER) {
    logger.warn(
      `[DEV EMAIL NOTIFICATION] Email delivery is not configured. Order status update for ${input.to}: Order #${input.orderId} is now ${input.status}`,
    );
    return;
  }

  const subject = `Order #${input.orderId.slice(0, 8)} Status Update: ${input.status} - OrderFirst`;
  const text = `Hi ${input.customerName},\n\nYour order #${input.orderId.slice(0, 8)} status has been updated to: ${input.status}.\n\nThank you for choosing OrderFirst!`;
  const html = `<p>Hi ${input.customerName},</p><p>Your order <strong>#${input.orderId.slice(0, 8)}</strong> status has been updated to: <span style="font-weight:bold;color:#2F4A3A;">${input.status}</span>.</p><p>Thank you for choosing OrderFirst!</p>`;

  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_USER,
      to: input.to,
      subject,
      text,
      html,
    });
    logger.info({ messageId: info.messageId }, 'Order status notification email sent');
  } catch (error) {
    logger.error(
      { error: errorContext(error) },
      'Order status notification email delivery failed',
    );
    throw error;
  }
}

export async function sendBookingNotificationEmail(input: {
  to: string;
  booking: BookingConfirmationInput;
}) {
  if (env.NODE_ENV === 'test') {
    lastTestNotification = { type: 'booking.created', to: input.to, payload: input.booking };
    return;
  }
  if (!transporter || !env.EMAIL_USER) {
    logger.warn(
      `[DEV EMAIL NOTIFICATION] Email delivery is not configured. Booking confirmation for ${input.to}: Reservation #${input.booking.bookingId}`,
    );
    return;
  }

  const { html, text } = buildBookingConfirmationEmailContent(input.booking);

  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_USER,
      to: input.to,
      subject: `Table Reservation Confirmed #${input.booking.bookingId.slice(0, 8)} - OrderFirst`,
      text,
      html,
    });
    logger.info({ messageId: info.messageId }, 'Booking notification email sent');
  } catch (error) {
    logger.error(
      { error: errorContext(error) },
      'Booking notification email delivery failed',
    );
    throw error;
  }
}

