import { randomInt } from 'node:crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../errors/app-error.js';
import { logger } from '../../config/logger.js';
import { serializableTransaction } from '../../utils/transaction.js';
import { publicUserSelect } from '../users/user.service.js';
import { publishUserRegistered } from '../../amqp/publisher.js';
import { flushOutboxEvents } from '../../amqp/outbox-relay.js';
import { getRequestId } from '../../config/context.js';
import type { z } from 'zod';
import type { registerRequest, loginRequest } from './auth.validation.js';

const verificationCodeTtlMs = 10 * 60 * 1000;
const maxVerificationAttempts = 5;
const resendCooldownMs = 60 * 1000;

function truncatePassword(password: string): string {
  const buf = Buffer.from(password, 'utf8');
  if (buf.byteLength <= 72) return password;
  return buf.subarray(0, 72).toString('utf8');
}

function generateVerificationCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

async function issueVerificationCode(
  userId: string,
  email: string,
  name: string,
) {
  const code = generateVerificationCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + verificationCodeTtlMs);
  const requestId = getRequestId();
  const eventPayload = {
    userId,
    name,
    email,
    otpCode: code,
    expiresAt: expiresAt.toISOString(),
  };

  await prisma.$transaction([
    prisma.emailVerificationCode.deleteMany({ where: { userId } }),
    prisma.emailVerificationCode.create({
      data: {
        userId,
        codeHash,
        expiresAt,
      },
    }),
    prisma.outboxEvent.create({
      data: {
        exchange: 'orderfirst.events',
        routingKey: 'user.registered',
        payload: eventPayload,
        correlationId: requestId ?? null,
      },
    }),
  ]);

  publishUserRegistered(eventPayload);
  void flushOutboxEvents().catch(() => {});
}

export async function registerUser(
  input: z.output<typeof registerRequest>['body'],
) {
  const safePassword = truncatePassword(input.password);
  const passwordHash = await bcrypt.hash(safePassword, 12);
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, emailVerifiedAt: true },
  });
  if (existingUser?.emailVerifiedAt)
    throw new AppError(
      409,
      'Email is already registered',
      'EMAIL_ALREADY_REGISTERED',
    );

  if (existingUser) {
    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: { name: input.name, passwordHash, emailVerifiedAt: null },
      select: publicUserSelect,
    });
    await issueVerificationCode(user.id, user.email, user.name);
    return user;
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      emailVerifiedAt: null,
    },
    select: publicUserSelect,
  });
  try {
    await issueVerificationCode(user.id, user.email, user.name);
    return user;
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } });
    throw error;
  }
}

// A fixed valid hash keeps the password comparison work similar for unknown users.
const dummyHash =
  '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';

export async function loginUser(input: z.output<typeof loginRequest>['body']) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      emailVerifiedAt: true,
      passwordHash: true,
    },
  });
  const safePassword = truncatePassword(input.password);
  const passwordMatches = await bcrypt.compare(
    safePassword,
    user?.passwordHash ?? dummyHash,
  );
  if (!user || !passwordMatches) {
    logger.warn({ userId: user?.id }, 'Authentication failed');
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

export async function verifyEmail(userId: string, code: string) {
  return serializableTransaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });
    if (!user)
      throw new AppError(401, 'Please log in to continue', 'UNAUTHENTICATED');
    if (user.emailVerifiedAt)
      throw new AppError(
        409,
        'Email is already verified',
        'EMAIL_ALREADY_VERIFIED',
      );
    const verificationCode = await transaction.emailVerificationCode.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!verificationCode)
      throw new AppError(
        400,
        'Verification code has expired. Request a new one.',
        'VERIFICATION_CODE_EXPIRED',
      );
    if (verificationCode.attempts >= maxVerificationAttempts)
      throw new AppError(
        429,
        'Too many failed attempts. Request a new verification code.',
        'VERIFICATION_ATTEMPTS_EXCEEDED',
      );
    await transaction.emailVerificationCode.update({
      where: { id: verificationCode.id },
      data: { attempts: { increment: 1 } },
    });
    const codeMatches = await bcrypt.compare(code, verificationCode.codeHash);
    if (!codeMatches)
      throw new AppError(
        400,
        'Invalid verification code',
        'INVALID_VERIFICATION_CODE',
      );
    await transaction.emailVerificationCode.deleteMany({ where: { userId } });
    return transaction.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
      select: publicUserSelect,
    });
  });
}

export async function resendVerificationEmail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerifiedAt: true },
  });
  if (!user)
    throw new AppError(401, 'Please log in to continue', 'UNAUTHENTICATED');
  if (user.emailVerifiedAt)
    throw new AppError(
      409,
      'Email is already verified',
      'EMAIL_ALREADY_VERIFIED',
    );
  const latestCode = await prisma.emailVerificationCode.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (
    latestCode &&
    Date.now() - latestCode.createdAt.getTime() < resendCooldownMs
  )
    throw new AppError(
      429,
      'Please wait before requesting another verification code',
      'VERIFICATION_RESEND_COOLDOWN',
    );
  await issueVerificationCode(user.id, user.email, user.name);
  return null;
}

