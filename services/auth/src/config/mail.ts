import nodemailer from 'nodemailer';
import { env } from './env.js';
import { logger, errorContext } from './logger.js';
import { AppError } from '../errors/app-error.js';
import { buildVerificationEmailContent } from './verification-email.template.js';

export let lastTestVerificationCode: string | undefined;

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

export async function sendVerificationEmail(input: {
  to: string;
  name: string;
  code: string;
}) {
  if (env.NODE_ENV === 'test') {
    lastTestVerificationCode = input.code;
    return;
  }
  if (!transporter || !env.EMAIL_USER) {
    if (env.NODE_ENV === 'production') {
      throw new AppError(
        503,
        'Email delivery is not configured',
        'EMAIL_NOT_CONFIGURED',
      );
    }
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
    logger.info(
      { to: input.to, messageId: info.messageId },
      'Verification email sent',
    );
  } catch (error) {
    logger.error(
      {
        to: input.to,
        error: errorContext(error),
        responseCode:
          error &&
          typeof error === 'object' &&
          'responseCode' in error &&
          typeof error.responseCode === 'number'
            ? error.responseCode
            : undefined,
      },
      'Verification email delivery failed',
    );
    throw new AppError(
      503,
      'Could not send verification email. Please try again.',
      'EMAIL_DELIVERY_FAILED',
    );
  }
}

