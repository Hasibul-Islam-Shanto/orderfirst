import { z } from 'zod';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email('Email must be valid'));

const password = z
  .string()
  .min(8, 'Password must contain at least 8 characters')
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'Password must be at most 72 UTF-8 bytes',
  );

export const loginRequest = z.object({
  body: z.strictObject({ email, password }),
});

export const registerRequest = z.object({
  body: z.strictObject({
    name: z.string().trim().min(2).max(80),
    email,
    password,
  }),
});

export const verifyEmailRequest = z.object({
  body: z.strictObject({
    code: z
      .string()
      .regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
  }),
});

export const resendVerificationRequest = z.object({
  body: z.strictObject({}),
});

export const updateProfileRequest = z.object({
  body: z.strictObject({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  }),
});

export const changePasswordRequest = z.object({
  body: z.strictObject({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
  }),
});

