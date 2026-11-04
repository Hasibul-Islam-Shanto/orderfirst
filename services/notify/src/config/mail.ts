import nodemailer from 'nodemailer';
import { env } from './env.js';
import { logger, errorContext } from './logger.js';
import { buildVerificationEmailContent } from './verification-email.template.js';

export let lastTestNotification:
  | { to: string; name: string; code: string }
  | undefined;

const transporter =
  env.EMAIL_USER && env.EMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: env.EMAIL_USER,
          pass: env.EMAIL_APP_PASSWORD,
        },
      })
    : null;

export async function sendNotificationEmail(input: {
  to: string;
  name: string;
  code: string;
}) {
  if (env.NODE_ENV === 'test') {
    lastTestNotification = input;
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
      from: env.EMAIL_USER,
      to: input.to,
      subject: 'Verify your OrderFirst account',
      text,
      html,
    });
    logger.info({ messageId: info.messageId }, 'Notification email sent');
  } catch (error) {
    logger.error(
      { error: errorContext(error) },
      'Notification email delivery failed',
    );
    throw error;
  }
}

